import { json } from '@sveltejs/kit';
import { runQuery } from '$lib/server/db';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function POST({ request, fetch }) {
	try {
		const body = await request.json();
		const studentId = requireNumeric(body?.studentId, 'studentId');
		const teacherId = requireNumeric(body?.teacherId, 'teacherId');

		await runQuery(
			fetch,
			`UPDATE classes
			 SET status = 'inactive'
			 WHERE teacher_id = ${teacherId} AND student_id = ${studentId}`
		);

		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to remove student from class' },
			{ status: error?.status ?? 500 }
		);
	}
}
