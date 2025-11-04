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

export async function POST({ request, fetch }) {
	try {
		const body = await request.json();
		const teacherId = requireNumeric(body?.teacherId, 'teacherId');

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT ta.id,
						ta.student_name,
						ta.score,
						ta.completed_at,
						ta.started_at,
						t.title
				 FROM test_attempts ta
				 JOIN tests t ON t.id = ta.test_id
				 WHERE t.teacher_id = ${teacherId}
				 ORDER BY ta.started_at DESC, ta.student_name`
			)
		);

		return json({ results: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load teacher results' },
			{ status: error?.status ?? 500 }
		);
	}
}
