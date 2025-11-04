import { json } from '@sveltejs/kit';
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

export async function GET({ request, fetch, locals }) {
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
			await runQuery(
				fetch,
				`SELECT id, name, description, mime_type, base64_data, file_size, created_at
				 FROM images
				 WHERE uploaded_by = ${teacherId}
				 ORDER BY created_at DESC`
			)
		);

		return json({ images: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load images' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function POST({ request, fetch, locals }) {
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

		const name = requireString(body?.name, 'name');
		const mimeType = requireString(body?.mimeType, 'mimeType');
		const base64Data = requireString(body?.base64Data, 'base64Data');
		const description = typeof body?.description === 'string' ? body.description.trim() : '';

		const fileSize = Math.round((base64Data.length * 3) / 4);

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`INSERT INTO images (name, description, mime_type, base64_data, uploaded_by, file_size)
				 VALUES ('${escapeSql(name)}', '${escapeSql(description)}', '${escapeSql(mimeType)}', '${escapeSql(
					base64Data
				)}', ${teacherId}, ${fileSize})
				 ON CONFLICT (name, uploaded_by)
				 DO UPDATE
				 SET description = EXCLUDED.description,
				     mime_type = EXCLUDED.mime_type,
				     base64_data = EXCLUDED.base64_data,
				     file_size = EXCLUDED.file_size
				 RETURNING id, name, description, mime_type, file_size, created_at`
			)
		);

		return json({ image: rows[0] }, { status: 201 });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to upload image' },
			{ status: error?.status ?? 500 }
		);
	}
}
