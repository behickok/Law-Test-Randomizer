import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';
import { resolveTeacherId } from '$lib/server/authGuard';

export async function POST({ request, fetch, locals }) {
        try {
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

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT ta.id,
						ta.student_name,
						ta.score,
						ta.completed_at,
						ta.started_at,
						t.title
				 FROM test_attempts ta
				 JOIN tests t ON t.id = ta.test_id
				 WHERE t.teacher_id = ${teacherId}
				 ORDER BY ta.started_at DESC, ta.student_name`
			)
		);

		return json({ results: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load teacher results' },
			{ status: error?.status ?? 500 }
		);
	}
}
