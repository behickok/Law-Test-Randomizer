import {
	constantTimeEqual,
	deriveScryptKey,
	hexToUint8Array,
	randomBytesHex,
	toHex
} from '$lib/server/crypto-utils';
import { normaliseCredential } from '$lib/credentials';
import { normaliseResult, runQuery } from '$lib/server/db';

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(pin, salt) {
	return deriveScryptKey(pin, salt, KEY_LENGTH);
}

export function hashPin(pin) {
        const credential = normaliseCredential(pin);
        const salt = randomBytesHex(SALT_LENGTH);
        const key = toHex(deriveKey(credential, salt));
        return `${salt}:${key}`;
}

export function verifyPin(pin, stored) {
        const credential = normaliseCredential(pin);
        if (!stored) return false;
        if (!stored.includes(':')) {
                return stored === credential;
        }
        const [salt, key] = stored.split(':');
        if (!salt || !key) return false;
        const derived = deriveKey(credential, salt);
	const storedKey = hexToUint8Array(key);
	if (derived.length !== storedKey.length) {
		return false;
	}
	return constantTimeEqual(derived, storedKey);
}

const PIN_TABLES = [
	{ name: 'teachers', idColumn: 'id' },
	{ name: 'students', idColumn: 'id' },
	{ name: 'reviewers', idColumn: 'id' }
];

export async function pinExists(db, pin, exclude) {
        for (const table of PIN_TABLES) {
                const rows = normaliseResult(
                        await runQuery(db, `SELECT ${table.idColumn} AS id, pin FROM ${table.name}`)
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

export { isLegacyPin, validateCredential } from '$lib/credentials';
