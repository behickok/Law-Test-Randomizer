import { json } from '@sveltejs/kit';
import { escapeSql, runQuery } from '$lib/server/db';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

function maybeString(value) {
	if (value === null || value === undefined) return null;
	if (typeof value === 'string') return value.trim();
	return String(value);
}

export async function POST({ params, request, fetch }) {
	try {
		const attemptId = requireNumeric(params.id, 'attemptId');
		const body = await request.json();
		const questionId = requireNumeric(body?.questionId, 'questionId');
		const choiceId =
			body?.choiceId === null || body?.choiceId === undefined
				? null
				: requireNumeric(body.choiceId, 'choiceId');
		const answerText = maybeString(body?.answerText);

		const choiceSql = choiceId === null ? 'NULL' : choiceId;
		const answerSql = answerText === null ? 'NULL' : `'${escapeSql(answerText)}'`;

		await runQuery(
			fetch,
			`UPDATE attempt_answers
			 SET choice_id = ${choiceSql},
			     answer_text = ${answerSql},
			     is_correct = NULL,
			     points_awarded = NULL
			 WHERE attempt_id = ${attemptId}
			   AND question_id = ${questionId}`
		);

		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to save answer' },
			{ status: error?.status ?? 500 }
		);
	}
}
