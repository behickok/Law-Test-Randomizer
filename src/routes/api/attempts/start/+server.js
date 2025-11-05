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

function processQuestionsWithImages(questions) {
	for (const question of questions) {
		question.processed_question_text = question.text ?? question.question_text ?? question.questionText;
	}
}

function shuffle(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export async function POST({request, locals}) {
	try {
		const body = await request.json();
		const testId = requireNumeric(body?.testId, 'testId');
		const studentId = requireNumeric(body?.studentId, 'studentId');
		const studentName = requireString(body?.studentName, 'studentName');

		const testRows = normaliseResult(
			await runQuery(locals.db,
				`SELECT id, title, teacher_id FROM tests WHERE id = ${testId}`
			)
		);
		const test = testRows[0];
		if (!test) {
			return json({ error: 'Test not found' }, { status: 404 });
		}

		const existingAttemptRows = normaliseResult(
			await runQuery(locals.db,
				`SELECT id
				 FROM test_attempts
				 WHERE test_id = ${testId}
				   AND student_id = ${studentId}
				   AND completed_at IS NULL
				 ORDER BY started_at DESC
				 LIMIT 1`
			)
		);

		let attemptId = existingAttemptRows[0]?.id ?? null;

		const sectionsRows = normaliseResult(
			await runQuery(locals.db,
				`SELECT id, section_name, section_order, total_questions
				 FROM sections
				 WHERE test_id = ${testId}
				 ORDER BY section_order`
			)
		);
		const sections = sectionsRows;

		if (attemptId) {
			const rows = normaliseResult(
				await runQuery(locals.db,
					`SELECT aa.id as attempt_answer_id,
					        q.id as question_id,
					        q.question_text,
					        q.points,
					        q.section_id,
					        s.section_name,
					        s.section_order,
					        s.total_questions,
					        c.id as choice_id,
					        c.choice_text,
					        c.is_correct,
					        aa.choice_id as selected_choice,
					        aa.answer_text
					 FROM attempt_answers aa
					 JOIN questions q ON q.id = aa.question_id
					 LEFT JOIN sections s ON q.section_id = s.id
					 LEFT JOIN choices c ON c.question_id = q.id
					 WHERE aa.attempt_id = ${attemptId}
					 ORDER BY aa.id, c.id`
				)
			);

			const questionsMap = new Map();
			for (const row of rows) {
				if (!questionsMap.has(row.question_id)) {
					questionsMap.set(row.question_id, {
						id: row.question_id,
						text: row.question_text,
						points: row.points ?? 1,
						section_id: row.section_id,
						section_name: row.section_name ?? 'Default Section',
						section_order: row.section_order ?? 1,
						total_questions: row.total_questions ?? 999,
						choices: [],
						selected: row.selected_choice,
						response: row.answer_text
					});
				}
				if (row.choice_id) {
					questionsMap.get(row.question_id).choices.push({
						id: row.choice_id,
						text: row.choice_text,
						is_correct: row.is_correct
					});
				}
			}
			const questions = Array.from(questionsMap.values());
			processQuestionsWithImages(questions);

			return json({ attemptId, test, questions, sections });
		}

		const questionRows = normaliseResult(
			await runQuery(locals.db,
				`SELECT q.id as question_id,
				        q.question_text,
				        q.points,
				        q.section_id,
				        s.section_name,
				        s.section_order,
				        s.total_questions,
				        c.id as choice_id,
				        c.choice_text,
				        c.is_correct
				 FROM questions q
				 LEFT JOIN sections s ON q.section_id = s.id
				 LEFT JOIN choices c ON q.id = c.question_id
				 WHERE q.test_id = ${testId}
				 ORDER BY s.section_order, q.id, c.id`
			)
		);

		const questionsMap = new Map();
		for (const row of questionRows) {
			if (!questionsMap.has(row.question_id)) {
				questionsMap.set(row.question_id, {
					id: row.question_id,
					text: row.question_text,
					points: row.points ?? 1,
					section_id: row.section_id,
					section_name: row.section_name ?? 'Default Section',
					section_order: row.section_order ?? 1,
					total_questions: row.total_questions ?? 999,
					choices: [],
					selected: null,
					response: null
				});
			}
			if (row.choice_id) {
				questionsMap.get(row.question_id).choices.push({
					id: row.choice_id,
					text: row.choice_text,
					is_correct: row.is_correct
				});
			}
		}

		const sectionGroups = new Map();
		for (const question of questionsMap.values()) {
			const sectionKey = question.section_id ?? 'default';
			if (!sectionGroups.has(sectionKey)) {
				sectionGroups.set(sectionKey, {
					name: question.section_name,
					order: question.section_order,
					total_questions: question.total_questions,
					questions: []
				});
			}
			sectionGroups.get(sectionKey).questions.push(question);
		}

		const finalQuestions = [];
		const sortedSections = Array.from(sectionGroups.values()).sort((a, b) => a.order - b.order);
		for (const section of sortedSections) {
			const shuffled = shuffle(section.questions);
			const selected = shuffled.slice(0, section.total_questions);
			finalQuestions.push(...selected);
		}

		const insertAttemptRows = normaliseResult(
			await runQuery(locals.db,
				`INSERT INTO test_attempts (test_id, student_id, student_name)
				 VALUES (${testId}, ${studentId}, '${escapeSql(studentName)}')
				 RETURNING id`
			)
		);
		attemptId = insertAttemptRows[0]?.id;
		if (!attemptId) {
			return json({ error: 'Failed to create test attempt' }, { status: 500 });
		}

		if (finalQuestions.length > 0) {
			const values = finalQuestions.map((q) => `(${attemptId}, ${q.id})`).join(', ');
			await runQuery(locals.db,
				`INSERT INTO attempt_answers (attempt_id, question_id)
				 VALUES ${values}`
			);
		}

		processQuestionsWithImages(finalQuestions);

		return json({ attemptId, test, questions: finalQuestions, sections });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to start attempt' },
			{ status: error?.status ?? 500 }
		);
	}
}
