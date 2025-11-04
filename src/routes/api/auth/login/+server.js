import { json } from '@sveltejs/kit';
import { escapeSql, runQuery, normaliseResult } from '$lib/server/db';
import { hashPin, verifyPin } from '$lib/server/pin';
import {
	createSession,
	getSessionCookieName,
	getSessionCookieOptions,
	makeSessionCookieValue
} from '$lib/server/session';
import {
	clearFailures,
	deriveLoginIdentifier,
	formatLockoutResponse,
	getLock,
	recordFailure
} from '$lib/server/loginRateLimit';

const ROLE_CONFIG = {
	teacher: {
		table: 'teachers',
		columns: 'id, name, pin',
		transform: (row) => ({ id: row.id, name: row.name, role: 'teacher' })
	},
	student: {
		table: 'students',
		columns: 'id, name, pin',
		transform: (row) => ({ id: row.id, name: row.name, role: 'student' })
	},
	reviewer: {
		table: 'reviewers',
		columns: 'id, name, email, pin, is_active',
		condition: 'AND is_active = TRUE',
		transform: (row) => ({ id: row.id, name: row.name, email: row.email, role: 'reviewer' })
	}
};

function retryAfterHeader(target) {
	if (!target) return undefined;
	const delta = Math.ceil((target.getTime() - Date.now()) / 1000);
	return delta > 0 ? String(delta) : undefined;
}

export async function POST({ request, fetch, cookies }) {
	try {
		const body = await request.json();
		const role = body?.role;
		const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';

		if (!ROLE_CONFIG[role]) {
			return json({ error: 'Unsupported role' }, { status: 400 });
		}

		if (!/^\d+$/.test(pin)) {
			return json({ error: 'PIN must be numeric' }, { status: 400 });
		}

		const identifierHash = deriveLoginIdentifier(role, pin);
		const lock = await getLock(fetch, identifierHash);
		if (lock?.lockedUntil && lock.lockedUntil.getTime() > Date.now()) {
			const headers = {};
			const retry = retryAfterHeader(lock.lockedUntil);
			if (retry) headers['Retry-After'] = retry;
			return json(formatLockoutResponse(lock.lockedUntil), { status: 429, headers });
		}

		const { table, columns, condition = '', transform } = ROLE_CONFIG[role];
		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT ${columns} FROM ${table} WHERE TRUE ${condition}`
			)
		);

		const match = rows.find((row) => verifyPin(pin, row.pin));
		if (!match) {
			const result = await recordFailure(fetch, identifierHash, lock?.failCount ?? 0);
			if (result.lockedUntil && result.lockedUntil.getTime() > Date.now()) {
				const headers = {};
				const retry = retryAfterHeader(result.lockedUntil);
				if (retry) headers['Retry-After'] = retry;
				return json(formatLockoutResponse(result.lockedUntil), { status: 429, headers });
			}
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		if (typeof match.pin === 'string' && !match.pin.includes(':')) {
			const hashed = hashPin(pin);
			await runQuery(
				fetch,
				`UPDATE ${table} SET pin = '${escapeSql(hashed)}' WHERE id = ${match.id}`
			);
			match.pin = hashed;
		}

		const { pin: _pin, is_active: _active, ...safe } = match;
		const formatted = typeof transform === 'function'
			? transform({ ...safe, pin: _pin })
			: { ...safe, role };

		await clearFailures(fetch, identifierHash);

		const sessionRecord = await createSession(fetch, formatted);
		cookies.set(
			getSessionCookieName(),
			makeSessionCookieValue(sessionRecord),
			{
				...getSessionCookieOptions(),
				expires: sessionRecord.expiresAt
			}
		);

		return json({ user: formatted });
	} catch (error) {
		return json(
			{ error: error?.message || 'Login failed' },
			{ status: error?.status ?? 500 }
		);
	}
}
