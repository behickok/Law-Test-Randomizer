import { PUBLIC_PASSPHRASE } from '$lib/server/env';

const BASE_URL = 'https://web-production-b1513.up.railway.app';

function escapeSql(str) {
	return str.replace(/'/g, "''");
}

async function run(sql) {
	const res = await fetch(`${BASE_URL}/query`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(PUBLIC_PASSPHRASE ? { Authorization: `Bearer ${PUBLIC_PASSPHRASE}` } : {})
		},
		body: JSON.stringify({ sql, source: 'duckdb' })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function POST({ request }) {
	const formData = await request.formData();
	const file = formData.get('file');
	const data = formData.get('data');
	let title = formData.get('title');
	let teacher_id = formData.get('teacher_id') || request.headers.get('x-teacher-id');

	// Handle file upload
	if (file && !title) {
		title = file.name.replace(/\.[^/.]+$/, '');
	}

	// Check that we have either file or data, plus required fields
	if ((!file && !data) || !title || !teacher_id) {
		return new Response('Missing file/data, title or teacher_id', { status: 400 });
	}
	if (!/^\d+$/.test(teacher_id)) {
		return new Response('Invalid teacher_id format', { status: 400 });
	}

	const text = file ? await file.text() : data;
	// create test
	const testRow = await run(
		`INSERT INTO tests (title, teacher_id) VALUES ('${escapeSql(
			title
		)}', ${teacher_id}) RETURNING id`
	);
	const test_id = testRow[0].id;
	const lines = text.trim().split(/\r?\n/);
	for (const line of lines) {
		if (!line) continue;
		const cols = line.split('\t'); // Use tab delimiter for better parsing
		if (cols.length < 7) continue; // need Question ID, Question, Answer 1, Answer 2, Answer 3, Answer 4, ANSWER

		const question_id_input = cols[0].trim();
		const question_text = escapeSql(cols[1].trim());
		const answer1 = escapeSql(cols[2].trim());
		const answer2 = escapeSql(cols[3].trim());
		const answer3 = escapeSql(cols[4].trim());
		const answer4 = escapeSql(cols[5].trim());
		const correctAnswer = cols[6].trim().toLowerCase();

		// Check if question with this ID already exists for this test
		const existingQuestion = await run(
			`SELECT id FROM questions WHERE test_id = ${test_id} AND question_id = '${escapeSql(question_id_input)}'`
		);

		let question_id;
		if (existingQuestion.length > 0) {
			// Update existing question
			question_id = existingQuestion[0].id;
			await run(
				`UPDATE questions SET question_text = '${question_text}' WHERE id = ${question_id}`
			);
			// Delete existing choices to replace them
			await run(`DELETE FROM choices WHERE question_id = ${question_id}`);
		} else {
			// Create new question
			const qRow = await run(
				`INSERT INTO questions (test_id, question_text, question_id) VALUES (${test_id}, '${question_text}', '${escapeSql(question_id_input)}') RETURNING id`
			);
			question_id = qRow[0].id;
		}

		// Insert all choices, marking the correct one
		const choices = [answer1, answer2, answer3, answer4];
		const correctIndex =
			correctAnswer === 'a'
				? 0
				: correctAnswer === 'b'
					? 1
					: correctAnswer === 'c'
						? 2
						: correctAnswer === 'd'
							? 3
							: -1;

		for (let i = 0; i < choices.length; i++) {
			const isCorrect = i === correctIndex;
			await run(
				`INSERT INTO choices (question_id, choice_text, is_correct) VALUES (${question_id}, '${choices[i]}', ${isCorrect})`
			);
		}
	}
	return new Response(JSON.stringify({ test_id }), { status: 200 });
}
