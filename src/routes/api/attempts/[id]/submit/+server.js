import { json } from '@sveltejs/kit';
import { runQuery, normaliseResult } from '$lib/server/db';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function POST({params, locals}) {
	try {
		const attemptId = requireNumeric(params.id, 'attemptId');

		await runQuery(locals.db,
			`UPDATE attempt_answers aa
			 SET is_correct = c.is_correct,
			     points_awarded = CASE WHEN c.is_correct THEN q.points ELSE 0 END
			 FROM choices c
			 JOIN questions q ON q.id = aa.question_id
			 WHERE aa.attempt_id = ${attemptId}
			   AND aa.choice_id = c.id`
		);

		await runQuery(locals.db,
			`UPDATE test_attempts
			 SET score = (
					SELECT CASE
						WHEN EXISTS (
							SELECT 1
							FROM attempt_answers
							WHERE attempt_id = ${attemptId}
							  AND points_awarded IS NULL
						) THEN NULL
						ELSE COALESCE(SUM(points_awarded), 0)
					END
					FROM attempt_answers
					WHERE attempt_id = ${attemptId}
				),
			     completed_at = CURRENT_TIMESTAMP
			 WHERE id = ${attemptId}`
		);

		const scoreRows = normaliseResult(
			await runQuery(locals.db,
				`SELECT score
				 FROM test_attempts
				 WHERE id = ${attemptId}`
			)
		);
		const score = scoreRows[0]?.score ?? null;

		return json({ id: attemptId, score });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to submit attempt' },
			{ status: error?.status ?? 500 }
		);
	}
}
