import { query } from '$lib/api';

function shuffle(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export async function load({ params, fetch }) {
	try {
		const tRes = await query(
			fetch,
			`select id, title, teacher_id from tests where id = ${params.id}`
		);
		const tData = Array.isArray(tRes) ? tRes : (tRes?.data ?? []);
		const test = tData[0];

		// Get sections for this test
		const sectionsRes = await query(
			fetch,
			`select id, section_name, section_order, total_questions 
			 from sections 
			 where test_id = ${params.id} 
			 order by section_order`
		);
		const sections = Array.isArray(sectionsRes) ? sectionsRes : (sectionsRes?.data ?? []);

		// Get all questions with their section information
		const qRes = await query(
			fetch,
			`select q.id as question_id, q.question_text, q.points, q.section_id,
					s.section_name, s.section_order, s.total_questions,
					c.id as choice_id, c.choice_text, c.is_correct
			 from questions q 
			 left join sections s on q.section_id = s.id
			 left join choices c on q.id = c.question_id
			 where q.test_id = ${params.id}
			 order by s.section_order, q.id`
		);
		const rows = Array.isArray(qRes) ? qRes : (qRes?.data ?? []);

		// Build questions map
		const questionsMap = new Map();
		for (const r of rows) {
			// Skip rows with invalid question_id
			if (!r.question_id) {
				console.warn('Skipping row with null/undefined question_id:', r);
				continue;
			}

			if (!questionsMap.has(r.question_id)) {
				questionsMap.set(r.question_id, {
					id: r.question_id,
					text: r.question_text,
					points: r.points || 1, // Default to 1 point if null
					section_id: r.section_id,
					section_name: r.section_name || 'Default Section',
					section_order: r.section_order || 1,
					total_questions: r.total_questions || 999,
					choices: []
				});
			}
			if (r.choice_id) {
				questionsMap.get(r.question_id).choices.push({
					id: r.choice_id,
					text: r.choice_text,
					is_correct: r.is_correct
				});
			}
		}

		// Group questions by section and randomize within each section
		const sectionGroups = new Map();
		for (const question of questionsMap.values()) {
			const sectionKey = question.section_id || 'default';
			if (!sectionGroups.has(sectionKey)) {
				sectionGroups.set(sectionKey, {
					name: question.section_name,
					order: question.section_order,
					total_questions: question.total_questions,
					questions: []
				});
			}
			sectionGroups.get(sectionKey).questions.push({
				...question,
				selected: null,
				correct: question.choices.find((c) => c.is_correct)?.id
			});
		}

		// Randomize questions within each section and select the required number
		const finalQuestions = [];
		const sortedSections = Array.from(sectionGroups.values()).sort((a, b) => a.order - b.order);

		for (const section of sortedSections) {
			const shuffledQuestions = shuffle(section.questions);
			const selectedQuestions = shuffledQuestions.slice(0, section.total_questions);
			finalQuestions.push(...selectedQuestions);
		}

		return { test, questions: finalQuestions, sections };
	} catch (err) {
		console.error('Error loading test:', err);
		return { error: 'Failed to load test' };
	}
}
