import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';
import { randomUUID, randomBytesHex, sha256Hex } from '$lib/server/crypto-utils';

const SESSION_COOKIE = 'ltr_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function hashToken(token) {
	return sha256Hex(token);
}

function now() {
	return new Date();
}

function toIso(date) {
	return date.toISOString();
}

function sanitiseUserPayload(user) {
	if (!user) return '{}';
	try {
		return JSON.stringify(user);
	} catch {
		return '{}';
	}
}

export async function createSession(db, user) {
	const sessionId = randomUUID();
	const token = randomBytesHex(32);
	const tokenHash = hashToken(token);
	const expiresAt = new Date(now().getTime() + SESSION_TTL_SECONDS * 1000);
	const payload = sanitiseUserPayload(user);

	await runQuery(
		db,
		`INSERT INTO auth_sessions (id, token_hash, user_id, role, user_payload, expires_at)
		 VALUES ('${escapeSql(sessionId)}', '${escapeSql(tokenHash)}', ${Number(user.id)}, '${escapeSql(user.role)}', '${escapeSql(
			payload
		)}', '${escapeSql(toIso(expiresAt))}')`
	);

	return {
		id: sessionId,
		token,
		expiresAt
	};
}

export async function destroySession(db, sessionId) {
	if (!sessionId) return;
	await runQuery(db, `DELETE FROM auth_sessions WHERE id = '${escapeSql(sessionId)}'`);
}

export async function readSession(db, cookieValue) {
	if (!cookieValue || typeof cookieValue !== 'string') {
		return null;
	}

	const [sessionId, token] = cookieValue.split('.');
	if (!sessionId || !token) {
		return null;
	}

	const rows = normaliseResult(
		await runQuery(
			db,
			`SELECT id, token_hash, role, user_id, user_payload, expires_at
			 FROM auth_sessions
			 WHERE id = '${escapeSql(sessionId)}'
			 LIMIT 1`
		)
	);

	if (rows.length === 0) return null;

	const session = rows[0];
	const expectedHash = session.token_hash;
	const incomingHash = hashToken(token);
	if (incomingHash !== expectedHash) {
		await destroySession(db, sessionId);
		return null;
	}

	const expiry = new Date(session.expires_at);
	if (Number.isNaN(expiry.valueOf()) || expiry.getTime() < now().getTime()) {
		await destroySession(db, sessionId);
		return null;
	}

	let user = null;
	try {
		user = JSON.parse(session.user_payload);
	} catch {
		user = null;
	}

	await runQuery(
		db,
		`UPDATE auth_sessions
		 SET last_used_at = CURRENT_TIMESTAMP
		 WHERE id = '${escapeSql(sessionId)}'`
	);

	return {
		id: sessionId,
		user: user ?? null,
		role: session.role,
		expiresAt: expiry
	};
}

export function makeSessionCookieValue(session) {
	return `${session.id}.${session.token}`;
}

export function getSessionCookieName() {
	return SESSION_COOKIE;
}

export function getSessionCookieOptions() {
	const secure = process.env.NODE_ENV === 'production';
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: SESSION_TTL_SECONDS
	};
}

export function clearSessionCookieOptions() {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 0
	};
}

export { hashToken };
