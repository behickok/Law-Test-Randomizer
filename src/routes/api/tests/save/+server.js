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
        const { text, title, teacher_id, test_id } = await request.json();
        if (!text || !teacher_id || (!test_id && !title)) {
                return new Response('Missing text, teacher_id or title/test_id', { status: 400 });
        }
        if (!/^\d+$/.test(String(teacher_id))) {
                return new Response('Invalid teacher_id format', { status: 400 });
        }

        let tid = test_id;
        if (!tid) {
                const testRow = await run(
                        `INSERT INTO tests (title, teacher_id) VALUES ('${escapeSql(title)}', ${teacher_id}) RETURNING id`
                );
                tid = testRow[0].id;
        } else if (title) {
                await run(`UPDATE tests SET title='${escapeSql(title)}' WHERE id=${tid} AND teacher_id=${teacher_id}`);
        }

        await run(
                `DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE test_id = ${tid});`
        );
        await run(`DELETE FROM questions WHERE test_id = ${tid};`);

        const lines = text.trim().split(/\r?\n/);
        for (const line of lines) {
                if (!line.trim()) continue;
                const cols = line.split(',');
                if (cols.length < 2) continue;
                const question_text = escapeSql(cols[0]);
                const correct = escapeSql(cols[1]);
                const wrongs = cols.slice(2).map((c) => escapeSql(c));
                const qRow = await run(
                        `INSERT INTO questions (test_id, question_text) VALUES (${tid}, '${question_text}') RETURNING id`
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

        return new Response(JSON.stringify({ test_id: tid }), { status: 200 });
}
