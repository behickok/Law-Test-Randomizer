import { sha256 } from '@noble/hashes/sha2.js';
import { scrypt } from '@noble/hashes/scrypt.js';
import {
	bytesToHex,
	hexToBytes,
	randomBytes as nobleRandomBytes,
	utf8ToBytes
} from '@noble/hashes/utils.js';

const DEFAULT_SCRYPT_PARAMS = {
	N: 1 << 14, // 16384
	r: 8,
	p: 1,
	dkLen: 32
};

function ensureCrypto() {
	if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
		throw new Error('Secure random number generator is not available in this environment.');
	}
}

export function randomUUID() {
	if (typeof globalThis.crypto?.randomUUID === 'function') {
		return globalThis.crypto.randomUUID();
	}
	const bytes = randomBytes(16);
	// Set version (4) and variant bits
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytesToHex(bytes);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function randomBytes(length) {
	ensureCrypto();
	return nobleRandomBytes(length);
}

export function randomBytesHex(length) {
	return bytesToHex(randomBytes(length));
}

export function sha256Hex(value) {
	const data = typeof value === 'string' ? utf8ToBytes(value) : value;
	return bytesToHex(sha256(data));
}

export function deriveScryptKey(password, salt, keyLength = DEFAULT_SCRYPT_PARAMS.dkLen) {
	const params = { ...DEFAULT_SCRYPT_PARAMS, dkLen: keyLength };
	const passwordBytes = typeof password === 'string' ? utf8ToBytes(password) : password;
	const saltBytes = typeof salt === 'string' ? utf8ToBytes(salt) : salt;
	return scrypt(passwordBytes, saltBytes, params);
}

export function deriveScryptKeyHex(password, salt, keyLength = DEFAULT_SCRYPT_PARAMS.dkLen) {
	return bytesToHex(deriveScryptKey(password, salt, keyLength));
}

export function hexToUint8Array(value) {
	return hexToBytes(value);
}

export function constantTimeEqual(a, b) {
	if (a.length !== b.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < a.length; i += 1) {
		diff |= a[i] ^ b[i];
	}
	return diff === 0;
}

export { bytesToHex as toHex };
