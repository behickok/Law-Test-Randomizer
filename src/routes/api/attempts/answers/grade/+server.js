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

function acceptBooleanOrNull(value, field) {
	if (value === null || value === undefined) return null;
	if (typeof value !== 'boolean') {
		const error = new Error(`${field} must be a boolean or null`);
		error.status = 400;
		throw error;
	}
	return value;
}

function acceptNumericOrNull(value, field) {
	if (value === null || value === undefined || value === '') return null;
	if (!/^\d+$/.test(String(value))) {
		const error = new Error(`${field} must be numeric or null`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function POST({ request, fetch }) {
	try {
		const body = await request.json();
		const teacherId = requireNumeric(body?.teacherId, 'teacherId');
		const answerId = requireNumeric(body?.answerId, 'answerId');
		const isCorrect = acceptBooleanOrNull(body?.isCorrect, 'isCorrect');
		const pointsAwarded = acceptNumericOrNull(body?.pointsAwarded, 'pointsAwarded');

		const ownership = normaliseResult(
			await runQuery(
				fetch,
				`SELECT aa.attempt_id
				 FROM attempt_answers aa
				 JOIN test_attempts ta ON ta.id = aa.attempt_id
				 JOIN tests t ON t.id = ta.test_id
				 WHERE aa.id = ${answerId} AND t.teacher_id = ${teacherId}
				 LIMIT 1`
			)
		);

		if (ownership.length === 0) {
			return json({ error: 'Answer not found or access denied' }, { status: 403 });
		}

		const setCorrect =
			isCorrect === null ? 'NULL' : isCorrect === true ? 'TRUE' : 'FALSE';
		const setPoints = pointsAwarded === null ? 'NULL' : pointsAwarded;

		await runQuery(
			fetch,
			`UPDATE attempt_answers
			 SET is_correct = ${setCorrect},
				 points_awarded = ${setPoints}
			 WHERE id = ${answerId};
			 UPDATE test_attempts
			 SET score = (
					SELECT CASE
						WHEN EXISTS (
							SELECT 1
							FROM attempt_answers
							WHERE attempt_id = test_attempts.id
							  AND points_awarded IS NULL
						) THEN NULL
						ELSE COALESCE(SUM(points_awarded), 0)
					END
					FROM attempt_answers
					WHERE attempt_id = test_attempts.id
				)
			 WHERE id = (SELECT attempt_id FROM attempt_answers WHERE id = ${answerId});`
		);

		return json({ ok: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to grade answer' },
			{ status: error?.status ?? 500 }
		);
	}
}
