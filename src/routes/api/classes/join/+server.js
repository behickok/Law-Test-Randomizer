import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';

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

export async function POST({request, locals}) {
	try {
		const body = await request.json();
		const studentId = requireNumeric(body?.studentId, 'studentId');
		const inviteCode = requireString(body?.inviteCode, 'inviteCode');

		const teacherRow = normaliseResult(
			await runQuery(locals.db,
				`SELECT id FROM teachers WHERE invite_code = '${escapeSql(inviteCode)}' LIMIT 1`
			)
		);

		if (teacherRow.length === 0) {
			return json({ error: 'Invite code not found' }, { status: 404 });
		}

		const teacherId = teacherRow[0].id;

		await runQuery(locals.db,
			`INSERT INTO classes (teacher_id, student_id, status)
			 VALUES (${teacherId}, ${studentId}, 'active')
			 ON CONFLICT (teacher_id, student_id)
			 DO UPDATE SET status = 'active'`
		);

		return json({ success: true, teacherId });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to join class' },
			{ status: error?.status ?? 500 }
		);
	}
}
