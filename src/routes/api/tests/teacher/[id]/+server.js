import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';

function requireNumeric(value) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error('teacherId must be numeric');
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function GET({ params, fetch }) {
	try {
		const teacherId = requireNumeric(params.id);

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT id, title, description, is_active
				 FROM tests
				 WHERE teacher_id = ${teacherId}
				 ORDER BY created_at DESC`
			)
		);

		return json({ tests: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load teacher tests' },
			{ status: error?.status ?? 500 }
		);
	}
}
