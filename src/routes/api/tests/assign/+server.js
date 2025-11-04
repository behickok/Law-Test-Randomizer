import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';
import { resolveTeacherId } from '$lib/server/authGuard';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

function requireString(value, field) {
	if (typeof value !== 'string' || !value.trim()) {
		const error = new Error(`${field} is required`);
		error.status = 400;
		throw error;
	}
	return value.trim();
}

export async function POST({ request, fetch, locals }) {
        try {
                const body = await request.json();
                const teacherId = resolveTeacherId(locals, body?.teacherId);
                const testId = requireNumeric(body?.testId, 'testId');
                const studentId = requireNumeric(body?.studentId, 'studentId');
                const studentName = requireString(body?.studentName, 'studentName');

		const ownership = normaliseResult(
			await runQuery(
				fetch,
				`SELECT id FROM tests WHERE id = ${testId} AND teacher_id = ${teacherId} LIMIT 1`
			)
		);

		if (ownership.length === 0) {
			return json({ error: 'Test not found or access denied' }, { status: 403 });
		}

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`INSERT INTO test_attempts (test_id, student_id, student_name)
				 VALUES (${testId}, ${studentId}, '${escapeSql(studentName)}')
				 RETURNING id`
			)
		);

		return json({ attemptId: rows[0]?.id ?? null });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to assign test' },
			{ status: error?.status ?? 500 }
		);
	}
}
