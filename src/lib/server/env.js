import { env } from '$env/dynamic/private';

const FALLBACK_BASE_URL = 'https://web-production-b1513.up.railway.app';

const rawToken = env.BACKEND_SERVICE_TOKEN ?? '';
const rawBaseUrl = env.BACKEND_BASE_URL ?? FALLBACK_BASE_URL;

if (!rawToken) {
        throw new Error(
                '[env] Missing BACKEND_SERVICE_TOKEN. Set a private token in environment variables to reach the data service.'
        );
}

if (env.PUBLIC_PASSPHRASE) {
        console.warn('[env] Ignoring deprecated PUBLIC_PASSPHRASE environment variable.');
}

export const BACKEND_SERVICE_TOKEN = rawToken;
export const BACKEND_BASE_URL = rawBaseUrl;
