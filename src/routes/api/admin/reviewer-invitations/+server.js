import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';
import { requireTeacher } from '$lib/server/authz';

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

export async function GET({ request, locals }) {
	try {
		const teacher = requireTeacher(locals);
		const teacherIdHeader = request.headers.get('x-teacher-id');
		if (teacherIdHeader && !/^\d+$/.test(teacherIdHeader)) {
			return json({ error: 'Missing or invalid x-teacher-id header' }, { status: 400 });
		}
		const teacherId = teacherIdHeader ? Number(teacherIdHeader) : teacher.id;
		if (teacherId !== teacher.id) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const rows = normaliseResult(
			await runQuery(locals.db,
				`SELECT id,
				        teacher_id,
				        reviewer_name,
				        reviewer_email,
				        invite_code,
				        status,
				        created_at,
				        accepted_at
				 FROM reviewer_invitations
				 WHERE teacher_id = ${teacherId}
				 ORDER BY created_at DESC`
			)
		);

		return json({ invitations: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load reviewer invitations' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function POST({ request, locals }) {
	try {
		const teacher = requireTeacher(locals);
		const body = await request.json();
		const teacherId =
			body?.teacherId !== undefined
				? requireNumeric(body.teacherId, 'teacherId')
				: teacher.id;
		if (teacherId !== teacher.id) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		const reviewerName = requireString(body?.reviewerName, 'reviewerName');
		const reviewerEmail = requireString(body?.reviewerEmail, 'reviewerEmail');

		// Ensure teacher exists
		const teacherCheck = normaliseResult(
			await runQuery(locals.db, `SELECT id FROM teachers WHERE id = ${teacherId} LIMIT 1`)
		);
		if (teacherCheck.length === 0) {
			return json({ error: 'Teacher not found' }, { status: 404 });
		}

		const inviteCode = randomUUID();

		const rows = normaliseResult(
			await runQuery(locals.db,
				`INSERT INTO reviewer_invitations (teacher_id, reviewer_name, reviewer_email, invite_code)
				 VALUES (${teacherId}, '${escapeSql(reviewerName)}', '${escapeSql(reviewerEmail)}', '${inviteCode}')
				 RETURNING id, reviewer_name, reviewer_email, invite_code, status, created_at`
			)
		);

		return json({ invitation: rows[0] }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to create reviewer invitation' },
			{ status: error?.status ?? 500 }
		);
	}
}
