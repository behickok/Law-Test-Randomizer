import { PUBLIC_PASSPHRASE } from '$lib/server/env';

const BASE_URL = 'https://web-production-b1513.up.railway.app';

function escapeSql(str) {
	// Basic single-quote escape for SQL string literals
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
	const data = formData.get('data');
	const test_id = formData.get('test_id');

	let title = formData.get('title') || undefined;
	let teacher_id = formData.get('teacher_id') || request.headers.get('x-teacher-id') || undefined;

	if (!data || !title || !teacher_id) {
		return new Response('Missing data, title or teacher_id', { status: 400 });
	}
	if (!/^\d+$/.test(teacher_id)) {
		return new Response('Invalid teacher_id format', { status: 400 });
	}

	// Validate test_id if provided (for updates)
	if (test_id && !/^\d+$/.test(test_id)) {
		return new Response('Invalid test_id format', { status: 400 });
	}

	const text = data;
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	if (lines.length === 0) {
		return new Response('No rows found in provided data.', { status: 400 });
	}

	try {
		let final_test_id;

		if (test_id) {
			// Update existing test - verify ownership first
			const ownershipCheck = await run(
				`SELECT id FROM tests WHERE id = ${test_id} AND teacher_id = ${teacher_id}`
			);

			if (ownershipCheck.length === 0) {
				return new Response('Test not found or access denied', { status: 403 });
			}

			// Update test title
			await run(`UPDATE tests SET title = '${escapeSql(title)}' WHERE id = ${test_id}`);

			// Delete existing questions and choices for this test
			await run(
				`DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE test_id = ${test_id})`
			);
			await run(`DELETE FROM questions WHERE test_id = ${test_id}`);

			final_test_id = test_id;
		} else {
			// Create new test
			const testRow = await run(
				`INSERT INTO tests (title, teacher_id) VALUES ('${escapeSql(title)}', ${teacher_id}) RETURNING id`
			);
			final_test_id = testRow[0].id;
		}

		for (const line of lines) {
			// Expect: QuestionID \t Question \t A \t B \t C \t D \t ANSWER (a/b/c/d)
			const cols = line.split('\t');
			if (cols.length < 7) {
				// Skip malformed lines quietly
				continue;
			}

			// Extract question ID and other data
			const question_id = escapeSql(cols[0].trim());
			const question_text = escapeSql(cols[1].trim());
			const answer1 = escapeSql(cols[2].trim());
			const answer2 = escapeSql(cols[3].trim());
			const answer3 = escapeSql(cols[4].trim());
			const answer4 = escapeSql(cols[5].trim());
			const correctAnswer = cols[6].trim().toLowerCase();

			// Insert new question with question_id
			const qRow = await run(
				`INSERT INTO questions (test_id, question_text, question_id) VALUES (${final_test_id}, '${question_text}', '${question_id}') RETURNING id`
			);
			const question_pk_id = qRow[0].id;

			// Compute correct index
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

			const allChoices = [answer1, answer2, answer3, answer4];

			// Insert 4 choices with is_correct flags
			for (let i = 0; i < allChoices.length; i++) {
				const isCorrect = i === correctIndex ? 'TRUE' : 'FALSE';
				await run(
					`INSERT INTO choices (question_id, choice_text, is_correct) VALUES (${question_pk_id}, '${allChoices[i]}', ${isCorrect})`
				);
			}
		}

		// Respond with success
		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	} catch (err) {
		return new Response(`Import failed: ${err.message || String(err)}`, { status: 500 });
	}
}
