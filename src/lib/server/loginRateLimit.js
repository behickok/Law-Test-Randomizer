import { createHash } from 'node:crypto';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function deriveLoginIdentifier(role, pin) {
	return createHash('sha256').update(`${role}|${pin}`).digest('hex');
}

export async function getLock(db, identifierHash) {
	const rows = normaliseResult(
		await runQuery(
			db,
			`SELECT identifier_hash, fail_count, locked_until
			 FROM auth_login_limits
			 WHERE identifier_hash = '${escapeSql(identifierHash)}'
			 LIMIT 1`
		)
	);
	if (rows.length === 0) return null;
	const row = rows[0];
	return {
		failCount: Number(row.fail_count) || 0,
		lockedUntil: row.locked_until ? new Date(row.locked_until) : null
	};
}

export async function recordFailure(db, identifierHash, currentFailCount) {
	const nextFailCount = currentFailCount + 1;
	const shouldLock = nextFailCount >= MAX_ATTEMPTS;
	const lockUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null;

	await runQuery(
		db,
		`INSERT INTO auth_login_limits (identifier_hash, fail_count, locked_until, last_attempt)
		 VALUES ('${escapeSql(identifierHash)}', ${shouldLock ? 0 : nextFailCount}, ${
			shouldLock ? `'${escapeSql(lockUntil.toISOString())}'` : 'NULL'
		}, CURRENT_TIMESTAMP)
		 ON CONFLICT (identifier_hash)
		 DO UPDATE SET
			fail_count = ${shouldLock ? 0 : nextFailCount},
			locked_until = ${shouldLock ? `'${escapeSql(lockUntil.toISOString())}'` : 'NULL'},
			last_attempt = CURRENT_TIMESTAMP`
	);

	return {
		failCount: shouldLock ? 0 : nextFailCount,
		lockedUntil: lockUntil
	};
}

export async function clearFailures(db, identifierHash) {
	await runQuery(db, `DELETE FROM auth_login_limits WHERE identifier_hash = '${escapeSql(identifierHash)}'`);
}

export function formatLockoutResponse(lockedUntil) {
	return {
		error: 'Too many login attempts. Please try again later.',
		retryAfter: lockedUntil?.toISOString()
	};
}
