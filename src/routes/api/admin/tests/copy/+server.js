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

export async function POST({request, locals}) {
	try {
		const body = await request.json();
		const testId = requireNumeric(body?.testId, 'testId');
		const fromTeacherId = requireNumeric(body?.fromTeacherId, 'fromTeacherId');
		const toTeacherId = requireNumeric(body?.toTeacherId, 'toTeacherId');
		const newTitle = requireString(body?.newTitle, 'newTitle');

		// Verify source test ownership
		const ownershipCheck = normaliseResult(
			await runQuery(locals.db,
				`SELECT id, title, description FROM tests WHERE id = ${testId} AND teacher_id = ${fromTeacherId}`
			)
		);

		if (ownershipCheck.length === 0) {
			return json({ error: 'Source test not found or access denied' }, { status: 403 });
		}

		const sourceTest = ownershipCheck[0];

		const newTestRes = normaliseResult(
			await runQuery(locals.db,
				`INSERT INTO tests (title, description, teacher_id, is_active)
				 VALUES ('${escapeSql(newTitle)}', '${escapeSql(sourceTest.description || '')}', ${toTeacherId}, FALSE)
				 RETURNING id`
			)
		);
		const newTestId = newTestRes[0]?.id;
		if (!newTestId) {
			return json({ error: 'Failed to create new test' }, { status: 500 });
		}

		// Copy sections
		const sections = normaliseResult(
			await runQuery(locals.db,
				`SELECT section_name, section_order, total_questions
				 FROM sections
				 WHERE test_id = ${testId}
				 ORDER BY section_order`
			)
		);

		const sectionMap = new Map();
		for (const section of sections) {
			const inserted = normaliseResult(
				await runQuery(locals.db,
					`INSERT INTO sections (test_id, section_name, section_order, total_questions)
					 VALUES (${newTestId}, '${escapeSql(section.section_name)}', ${section.section_order}, ${section.total_questions})
					 RETURNING id`
				)
			);
			sectionMap.set(section.section_name, inserted[0]?.id);
		}

		// Copy questions
		const questions = normaliseResult(
			await runQuery(locals.db,
				`SELECT q.id,
				        q.question_text,
				        q.points,
				        q.section_id,
				        s.section_name
				 FROM questions q
				 LEFT JOIN sections s ON q.section_id = s.id
				 WHERE q.test_id = ${testId}
				 ORDER BY q.id`
			)
		);

		const questionMap = new Map();
		for (const question of questions) {
			const newSectionId = question.section_name ? sectionMap.get(question.section_name) : null;
			const inserted = normaliseResult(
				await runQuery(locals.db,
					`INSERT INTO questions (test_id, question_text, points, section_id)
					 VALUES (${newTestId}, '${escapeSql(question.question_text)}', ${question.points || 1}, ${
						newSectionId ?? 'NULL'
					})
					 RETURNING id`
				)
			);
			questionMap.set(question.id, inserted[0]?.id);
		}

		if (questions.length > 0) {
			const questionIds = questions.map((q) => q.id).join(', ');
			const choices = normaliseResult(
				await runQuery(locals.db,
					`SELECT choice_text, is_correct, question_id
					 FROM choices
					 WHERE question_id IN (${questionIds})
					 ORDER BY question_id, id`
				)
			);

			for (const choice of choices) {
				const mappedQuestionId = questionMap.get(choice.question_id);
				if (!mappedQuestionId) continue;
				await runQuery(locals.db,
					`INSERT INTO choices (question_id, choice_text, is_correct)
					 VALUES (${mappedQuestionId}, '${escapeSql(choice.choice_text)}', ${
						choice.is_correct ? 'TRUE' : 'FALSE'
					})`
				);
			}
		}

		return json({
			success: true,
			newTestId,
			message: `Test "${sourceTest.title}" copied as "${newTitle}"`
		});
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to copy test' },
			{ status: error?.status ?? 500 }
		);
	}
}
