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

export async function GET({ params, url, fetch }) {
	try {
		const testId = requireNumeric(params.id, 'testId');
		const teacherParam = url.searchParams.get('teacherId');
		if (!teacherParam) {
			return json({ error: 'teacherId query parameter is required' }, { status: 400 });
		}
		const teacherId = requireNumeric(teacherParam, 'teacherId');

		const ownership = normaliseResult(
			await runQuery(
				fetch,
				`SELECT id FROM tests WHERE id = ${testId} AND teacher_id = ${teacherId} LIMIT 1`
			)
		);

		if (ownership.length === 0) {
			return json({ error: 'Test not found or access denied' }, { status: 404 });
		}

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT q.id as question_id,
				        q.question_text,
				        q.points,
				        q.section_id,
				        s.section_name,
				        s.section_order,
				        s.total_questions,
				        c.choice_text,
				        c.is_correct,
				        c.id as choice_id
				 FROM questions q
				 LEFT JOIN sections s ON q.section_id = s.id
				 LEFT JOIN choices c ON q.id = c.question_id
				 WHERE q.test_id = ${testId}
				 ORDER BY s.section_order, q.id, c.id`
			)
		);

		const questionsMap = new Map();

		for (const row of rows) {
			const questionId = row.question_id;
			if (!questionsMap.has(questionId)) {
				questionsMap.set(questionId, {
					id: questionId,
					question_text: row.question_text,
					points: row.points,
					section_id: row.section_id,
					section_name: row.section_name || 'Default Section',
					section_order: row.section_order || 1,
					total_questions: row.total_questions || 999,
					choices: []
				});
			}
			if (row.choice_id) {
				questionsMap.get(questionId).choices.push({
					id: row.choice_id,
					text: row.choice_text,
					is_correct: row.is_correct
				});
			}
		}

		return json({ questions: Array.from(questionsMap.values()) });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load test questions' },
			{ status: error?.status ?? 500 }
		);
	}
}
