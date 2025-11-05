import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';
import { resolveTeacherId } from '$lib/server/authGuard';

export async function GET({ locals }) {
        try {
                const teacherId = resolveTeacherId(locals);

                const rows = normaliseResult(
                        await runQuery(locals.db,
                                `SELECT id, title, description, is_active
                                 FROM tests
                                 WHERE teacher_id = ${teacherId}
                                 ORDER BY created_at DESC`
                        )
                );

                return json({ tests: rows });
        } catch (error) {
                return json(
                        { error: error?.message ?? 'Failed to load teacher tests' },
                        { status: error?.status ?? 500 }
                );
        }
}
