import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

function requireString(value, field) {
	if (typeof value !== 'string' || !value.trim()) {
		const error = new Error(`${field} is required`);
		error.status = 400;
		throw error;
	}
	return value.trim();
}

export async function PUT({ params, request, fetch }) {
	try {
		const questionId = requireNumeric(params.id, 'questionId');
		const body = await request.json();
		const teacherId = requireNumeric(body?.teacherId, 'teacherId');
		const text = requireString(body?.text, 'text');
		const points = requireNumeric(body?.points, 'points');

		const questionOwnership = normaliseResult(
			await runQuery(
				fetch,
				`SELECT 1
				 FROM questions q
				 JOIN tests t ON q.test_id = t.id
				 WHERE q.id = ${questionId}
				   AND t.teacher_id = ${teacherId}
				 LIMIT 1`
			)
		);

		if (questionOwnership.length === 0) {
			return json({ error: 'Question not found or access denied' }, { status: 404 });
		}

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`UPDATE questions
				 SET question_text = '${escapeSql(text)}',
				     points = ${points}
				 WHERE id = ${questionId}
				 RETURNING id, question_text, points`
			)
		);

		return json({ question: rows[0] });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to update question' },
			{ status: error?.status ?? 500 }
		);
	}
}
