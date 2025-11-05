import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';

export async function GET({ locals }) {
	try {
		const rows = normaliseResult(
			await runQuery(locals.db,
				`SELECT id, name, email
				 FROM reviewers
				 WHERE is_active = TRUE
				 ORDER BY name`
			)
		);
		return json({ reviewers: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load reviewers' },
			{ status: error?.status ?? 500 }
		);
	}
}
