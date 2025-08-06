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
        let title = formData.get('title');
        let teacher_id = formData.get('teacher_id') || request.headers.get('x-teacher-id');

        if (file && !title) {
                title = file.name.replace(/\.[^/.]+$/, '');
        }

        if (!file || !title || !teacher_id) {
                return new Response('Missing file, title or teacher_id', { status: 400 });
        }
        if (!/^\d+$/.test(teacher_id)) {
                return new Response('Invalid teacher_id format', { status: 400 });
        }
	const text = await file.text();
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
		const cols = line.split(',');
		if (cols.length < 2) continue; // need at least question and correct answer
		const question_text = escapeSql(cols[0]);
		const correct = escapeSql(cols[1]);
		const wrongs = cols.slice(2).map((c) => escapeSql(c));
		const qRow = await run(
			`INSERT INTO questions (test_id, question_text) VALUES (${test_id}, '${question_text}') RETURNING id`
		);
		const question_id = qRow[0].id;
		await run(
			`INSERT INTO choices (question_id, choice_text, is_correct) VALUES (${question_id}, '${correct}', TRUE)`
		);
		for (const wrong of wrongs) {
			await run(
				`INSERT INTO choices (question_id, choice_text, is_correct) VALUES (${question_id}, '${wrong}', FALSE)`
			);
		}
	}
	return new Response(JSON.stringify({ test_id }), { status: 200 });
}
