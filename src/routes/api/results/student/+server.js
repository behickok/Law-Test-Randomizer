import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function POST({request, locals}) {
	try {
		const body = await request.json();
		const studentId = requireNumeric(body?.studentId, 'studentId');

		const rows = normaliseResult(
			await runQuery(locals.db,
				`SELECT t.id AS test_id,
						t.title,
						ta.score,
						ta.completed_at
				 FROM test_attempts ta
				 JOIN tests t ON t.id = ta.test_id
				 WHERE ta.student_id = ${studentId}
				   AND (t.is_active = TRUE OR ta.completed_at IS NOT NULL)`
			)
		);

		return json({ results: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load student results' },
			{ status: error?.status ?? 500 }
		);
	}
}
