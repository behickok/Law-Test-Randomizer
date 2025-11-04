import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';
import { resolveTeacherId } from '$lib/server/authGuard';

function requireNumeric(value, field) {
        if (!/^\d+$/.test(String(value ?? ''))) {
                const error = new Error(`${field} must be numeric`);
                error.status = 400;
                throw error;
        }
        return Number(value);
}

async function parseJson(request) {
        const contentType = request.headers.get('content-type') ?? '';
        if (!contentType.toLowerCase().includes('application/json')) {
                return {};
        }

        try {
                return await request.json();
        } catch (error) {
                const err = new Error('Invalid JSON payload');
                err.status = 400;
                err.cause = error;
                throw err;
        }
}

export async function DELETE({ params, request, fetch, locals }) {
        try {
                const testId = requireNumeric(params.id, 'testId');
                const body = await parseJson(request);
                const teacherId = resolveTeacherId(locals, body?.teacherId);

                const ownership = normaliseResult(
                        await runQuery(
                                fetch,
                                `SELECT id FROM tests WHERE id = ${testId} AND teacher_id = ${teacherId} LIMIT 1`
                        )
                );

                if (ownership.length === 0) {
                        return json({ error: 'Test not found or access denied' }, { status: 404 });
                }

                await runQuery(
                        fetch,
                        `DELETE FROM attempt_answers WHERE question_id IN (SELECT id FROM questions WHERE test_id = ${testId})`
                );
                await runQuery(
                        fetch,
                        `DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE test_id = ${testId})`
                );
                await runQuery(fetch, `DELETE FROM questions WHERE test_id = ${testId}`);
                await runQuery(fetch, `DELETE FROM sections WHERE test_id = ${testId}`);
                await runQuery(fetch, `DELETE FROM test_attempts WHERE test_id = ${testId}`);
                await runQuery(fetch, `DELETE FROM tests WHERE id = ${testId}`);

                return json({ success: true });
        } catch (error) {
                return json(
                        { error: error?.message ?? 'Failed to delete test' },
                        { status: error?.status ?? 500 }
                );
        }
}
