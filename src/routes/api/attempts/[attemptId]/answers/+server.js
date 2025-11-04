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

export async function POST({ params, request, fetch }) {
	try {
		const attemptId = requireNumeric(params.attemptId, 'attemptId');
		const body = await request.json();
		const teacherId = requireNumeric(body?.teacherId, 'teacherId');

		const ownership = normaliseResult(
			await runQuery(
				fetch,
				`SELECT ta.id
				 FROM test_attempts ta
				 JOIN tests t ON t.id = ta.test_id
				 WHERE ta.id = ${attemptId} AND t.teacher_id = ${teacherId}
				 LIMIT 1`
			)
		);

		if (ownership.length === 0) {
			return json({ error: 'Attempt not found or access denied' }, { status: 403 });
		}

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT aa.id,
						q.question_text,
						q.points,
						c.choice_text AS student_answer,
						aa.answer_text,
						aa.is_correct,
						aa.points_awarded,
						correct_c.choice_text AS correct_answer
				 FROM attempt_answers aa
				 JOIN questions q ON q.id = aa.question_id
				 LEFT JOIN choices c ON c.id = aa.choice_id
				 LEFT JOIN choices correct_c
					   ON correct_c.question_id = q.id AND correct_c.is_correct = TRUE
				 WHERE aa.attempt_id = ${attemptId}
				 ORDER BY aa.id`
			)
		);

		return json({ answers: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load attempt answers' },
			{ status: error?.status ?? 500 }
		);
	}
}
