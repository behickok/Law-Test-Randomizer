import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';

export async function GET({ fetch }) {
	try {
		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT id, title, description, is_active
				 FROM tests
				 WHERE is_active = TRUE
				 ORDER BY title`
			)
		);

		return json({ tests: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load active tests' },
			{ status: error?.status ?? 500 }
		);
	}
}
