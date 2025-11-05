# Credential Hardening Playbook

## Current Status (2025-11-04)
- Admin creation/update endpoints now hash passphrases and never echo secrets back to the client (`src/routes/api/admin/students/+server.js`, `src/routes/api/admin/reviewers/[id]/+server.js`).
- The admin dashboard displays credential status and supports optional passphrase resets (`src/routes/admin/+page.svelte`).
- Successful logins automatically upgrade legacy plaintext records to hashed values without user-visible changes (`src/routes/api/auth/login/+server.js`).

## Migration Backfill Guidance
Some dormant users may still have legacy numeric PINs until they authenticate. To proactively re-hash every account:

1. Export the current credential set for each role:
   ```sql
   SELECT id, pin FROM teachers;
   SELECT id, pin FROM students;
   SELECT id, pin FROM reviewers;
   ```
2. For any row where `pin` does not contain a colon (`:`) hash it with `hashPin` from `src/lib/server/pin.js` and update the record:
   ```js
   import { hashPin } from '../src/lib/server/pin.js';
   import { escapeSql, runQuery } from '../src/lib/server/db.js';

   const upgrade = async (table, id, rawPin) => {
     const hashed = hashPin(rawPin);
     await runQuery(undefined, `UPDATE ${table} SET pin = '${escapeSql(hashed)}' WHERE id = ${id}`);
   };
   ```
   > The repository includes `scripts/migrate-pins.js`; run it with `node scripts/migrate-pins.js` after exporting `BACKEND_BASE_URL` and `BACKEND_SERVICE_TOKEN`. Use parameterised queries if you customise the snippet.
3. After backfill, rotate invite codes and notify users to adopt stronger credentials.

## Next Security Steps
- Add brute-force protection and account lockouts to `/api/auth/login`.
- Replace client-managed local storage with server-issued sessions (HTTP-only cookies or signed JWT + refresh).
- Introduce passphrase rotation policies and administrative reset tooling with audit logs.
- Add automated tests that cover credential provisioning, reuse detection, and failed login throttling.
