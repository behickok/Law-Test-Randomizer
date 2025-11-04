import { json } from '@sveltejs/kit';
import { runQuery } from '$lib/server/db';
import { requireTeacher } from '$lib/server/authz';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function POST({ request, fetch, locals }) {
	try {
		requireTeacher(locals);
		const body = await request.json();
		const studentId = requireNumeric(body?.studentId, 'studentId');
		const teacherId = requireNumeric(body?.teacherId, 'teacherId');

		await runQuery(
			fetch,
			`INSERT INTO classes (teacher_id, student_id, status)
			 VALUES (${teacherId}, ${studentId}, 'active')
			 ON CONFLICT (teacher_id, student_id)
			 DO UPDATE SET status = 'active'`
		);

		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to assign student to class' },
			{ status: error?.status ?? 500 }
		);
	}
}
