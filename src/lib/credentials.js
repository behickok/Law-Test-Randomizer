const MIN_LENGTH = 10;
const MAX_LENGTH = 128;
const LETTER_REGEX = /[A-Za-z]/;
const NUMBER_REGEX = /\d/;
const WHITESPACE_REGEX = /\s/;

export const MIN_CREDENTIAL_LENGTH = MIN_LENGTH;
export const MAX_CREDENTIAL_LENGTH = MAX_LENGTH;

export function normaliseCredential(value) {
        if (typeof value !== 'string') {
                return '';
        }
        return value.trim();
}

export function validateCredential(value) {
        const credential = normaliseCredential(value);

        if (!credential) {
                throw new Error('Credential is required');
        }

        if (credential.length < MIN_LENGTH) {
                throw new Error(`Credential must be at least ${MIN_LENGTH} characters long`);
        }

        if (credential.length > MAX_LENGTH) {
                throw new Error(`Credential must be at most ${MAX_LENGTH} characters long`);
        }

        if (WHITESPACE_REGEX.test(credential)) {
                throw new Error('Credential cannot include whitespace characters');
        }

        if (!LETTER_REGEX.test(credential) || !NUMBER_REGEX.test(credential)) {
                throw new Error('Credential must include at least one letter and one number');
        }

        return credential;
}

export function isStrongCredential(value) {
        try {
                validateCredential(value);
                return true;
        } catch {
                return false;
        }
}

export function isLegacyPin(value) {
        const credential = normaliseCredential(value);
        return credential.length >= 4 && /^\d+$/.test(credential);
}

export const credentialRequirements = {
        minLength: MIN_LENGTH,
        maxLength: MAX_LENGTH,
        description:
                'Use 10-128 characters with at least one letter and one number. Spaces are not allowed.'
};
