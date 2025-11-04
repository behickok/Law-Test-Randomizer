import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';
import { resolveTeacherId } from '$lib/server/authGuard';

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

function requireBoolean(value, field) {
	if (typeof value !== 'boolean') {
		const error = new Error(`${field} must be a boolean`);
		error.status = 400;
		throw error;
	}
	return value;
}

export async function PUT({ params, request, fetch, locals }) {
        try {
                const choiceId = requireNumeric(params.id, 'choiceId');
                const body = await request.json();
                const teacherId = resolveTeacherId(locals, body?.teacherId);
		const text = requireString(body?.text, 'text');
		const isCorrect = requireBoolean(body?.isCorrect, 'isCorrect');

		const ownership = normaliseResult(
			await runQuery(
				fetch,
				`SELECT 1
				 FROM choices c
				 JOIN questions q ON q.id = c.question_id
				 JOIN tests t ON t.id = q.test_id
				 WHERE c.id = ${choiceId}
				   AND t.teacher_id = ${teacherId}
				 LIMIT 1`
			)
		);

		if (ownership.length === 0) {
			return json({ error: 'Choice not found or access denied' }, { status: 404 });
		}

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`UPDATE choices
				 SET choice_text = '${escapeSql(text)}',
				     is_correct = ${isCorrect ? 'TRUE' : 'FALSE'}
				 WHERE id = ${choiceId}
				 RETURNING id, choice_text, is_correct`
			)
		);

		return json({ choice: rows[0] });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to update choice' },
			{ status: error?.status ?? 500 }
		);
	}
}
