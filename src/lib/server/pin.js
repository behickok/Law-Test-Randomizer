import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { normaliseResult, runQuery } from '$lib/server/db';

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(pin, salt) {
	return scryptSync(pin, salt, KEY_LENGTH);
}

export function hashPin(pin) {
	const salt = randomBytes(SALT_LENGTH).toString('hex');
	const key = deriveKey(pin, salt).toString('hex');
	return `${salt}:${key}`;
}

export function verifyPin(pin, stored) {
	if (!stored) return false;
	if (!stored.includes(':')) {
		return stored === pin;
	}
	const [salt, key] = stored.split(':');
	if (!salt || !key) return false;
	const derived = deriveKey(pin, salt);
	const storedKey = Buffer.from(key, 'hex');
	if (derived.length !== storedKey.length) {
		return false;
	}
	return timingSafeEqual(derived, storedKey);
}

const PIN_TABLES = [
	{ name: 'teachers', idColumn: 'id' },
	{ name: 'students', idColumn: 'id' },
	{ name: 'reviewers', idColumn: 'id' }
];

export async function pinExists(fetch, pin, exclude) {
	for (const table of PIN_TABLES) {
		const rows = normaliseResult(
			await runQuery(fetch, `SELECT ${table.idColumn} AS id, pin FROM ${table.name}`)
		);
		for (const row of rows) {
			if (exclude && exclude.table === table.name && exclude.id === row.id) {
				continue;
			}
			if (verifyPin(pin, row.pin)) {
				return true;
			}
		}
	}
	return false;
}
