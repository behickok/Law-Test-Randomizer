import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';
import { resolveTeacherId } from '$lib/server/authGuard';

export async function GET({ locals, fetch }) {
        try {
                const teacherId = resolveTeacherId(locals);

                const rows = normaliseResult(
                        await runQuery(
                                fetch,
				`SELECT s.id, s.name
				 FROM classes c
				 JOIN students s ON s.id = c.student_id
				 WHERE c.teacher_id = ${teacherId}
				   AND c.status = 'active'
				 ORDER BY s.name`
			)
		);

		return json({ students: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load class students' },
			{ status: error?.status ?? 500 }
		);
	}
}
