import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';
import { resolveTeacherId } from '$lib/server/authGuard';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function POST({ params, request, locals }) {
        try {
                const attemptId = requireNumeric(params.attemptId, 'attemptId');
                let body = {};
                const contentType = request.headers.get('content-type') ?? '';
                if (contentType.toLowerCase().includes('application/json')) {
                        try {
                                body = await request.json();
                        } catch (error) {
                                const err = new Error('Invalid JSON payload');
                                err.status = 400;
                                err.cause = error;
                                throw err;
                        }
                }
                const teacherId = resolveTeacherId(locals, body?.teacherId);

                const ownership = normaliseResult(
                        await runQuery(locals.db, {
                                text: `SELECT ta.id
                                 FROM test_attempts ta
                                 JOIN tests t ON t.id = ta.test_id
                                 WHERE ta.id = $1 AND t.teacher_id = $2
                                 LIMIT 1`,
                                values: [attemptId, teacherId]
                        })
                );

		if (ownership.length === 0) {
			return json({ error: 'Attempt not found or access denied' }, { status: 403 });
		}

                const rows = normaliseResult(
                        await runQuery(locals.db, {
                                text: `SELECT aa.id,
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
                                 WHERE aa.attempt_id = $1
                                 ORDER BY aa.id`,
                                values: [attemptId]
                        })
                );

		return json({ answers: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load attempt answers' },
			{ status: error?.status ?? 500 }
		);
	}
}
