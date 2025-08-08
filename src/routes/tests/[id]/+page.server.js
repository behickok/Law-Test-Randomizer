import { query } from '$lib/api';

export async function load({ params, fetch }) {
	try {
		const tRes = await query(fetch, `select id, title from tests where id = ${params.id}`);
		const tData = Array.isArray(tRes) ? tRes : (tRes?.data ?? []);
		const test = tData[0];

		const qRes = await query(
			fetch,
			`select q.id as question_id, q.question_text, c.id as choice_id, c.choice_text, c.is_correct
                        from questions q join choices c on q.id = c.question_id
                        where q.test_id = ${params.id}`
		);
		const rows = Array.isArray(qRes) ? qRes : (qRes?.data ?? []);
		const map = new Map();
		for (const r of rows) {
			if (!map.has(r.question_id)) {
				map.set(r.question_id, {
					id: r.question_id,
					text: r.question_text,
					choices: []
				});
			}
			map.get(r.question_id).choices.push({
				id: r.choice_id,
				text: r.choice_text,
				is_correct: r.is_correct
			});
		}
		const questions = Array.from(map.values()).map((q) => ({
			...q,
			selected: null,
			correct: q.choices.find((c) => c.is_correct)?.id
		}));
		return { test, questions };
	} catch {
		return { error: 'Failed to load test' };
	}
}
