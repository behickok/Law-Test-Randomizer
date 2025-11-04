import { env } from '$env/dynamic/private';

const FALLBACK_BASE_URL = 'https://web-production-b1513.up.railway.app';

const rawToken = env.BACKEND_SERVICE_TOKEN ?? env.PUBLIC_PASSPHRASE ?? '';
const rawBaseUrl = env.BACKEND_BASE_URL ?? FALLBACK_BASE_URL;

if (!rawToken) {
	console.warn(
		'[env] Missing BACKEND_SERVICE_TOKEN. Set a private token in environment variables to reach the data service.'
	);
} else if (!env.BACKEND_SERVICE_TOKEN && env.PUBLIC_PASSPHRASE) {
	console.warn(
		'[env] Using deprecated PUBLIC_PASSPHRASE fallback. Rename to BACKEND_SERVICE_TOKEN to keep the token private.'
	);
}

export const BACKEND_SERVICE_TOKEN = rawToken;
export const BACKEND_BASE_URL = rawBaseUrl;
