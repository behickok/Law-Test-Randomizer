import type { D1Database } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {
			db: D1Database | null;
			user: Record<string, unknown> | null;
			sessionId: string | null;
		}

		interface Platform {
			env: {
				DB: D1Database;
			};
		}
	}
}

export {};
