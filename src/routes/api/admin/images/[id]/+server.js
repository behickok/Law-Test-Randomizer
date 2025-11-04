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

export async function GET({ params, request, fetch }) {
	try {
		const imageId = requireNumeric(params.id, 'image id');
		const teacherId = requireNumeric(request.headers.get('x-teacher-id'), 'x-teacher-id');

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT id, name, description, mime_type, base64_data, file_size, created_at
				 FROM images
				 WHERE id = ${imageId} AND uploaded_by = ${teacherId}
				 LIMIT 1`
			)
		);

		if (rows.length === 0) {
			return json({ error: 'Image not found or access denied' }, { status: 404 });
		}

		return json({ image: rows[0] });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load image' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function PUT({ params, request, fetch }) {
	try {
		const imageId = requireNumeric(params.id, 'image id');
		const body = await request.json();
		const teacherId =
			body?.teacherId !== undefined
				? requireNumeric(body.teacherId, 'teacherId')
				: requireNumeric(request.headers.get('x-teacher-id'), 'x-teacher-id');

		const name = typeof body?.name === 'string' ? body.name.trim() : '';
		if (!name) {
			return json({ error: 'name is required' }, { status: 400 });
		}
		const description = typeof body?.description === 'string' ? body.description.trim() : '';

		const result = normaliseResult(
			await runQuery(
				fetch,
				`UPDATE images
				 SET name = '${escapeSql(name)}',
				     description = '${escapeSql(description)}'
				 WHERE id = ${imageId} AND uploaded_by = ${teacherId}
				 RETURNING id, name, description`
			)
		);

		if (result.length === 0) {
			return json({ error: 'Image not found or access denied' }, { status: 404 });
		}

		return json({ image: result[0] });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to update image' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function DELETE({ params, request, fetch }) {
	try {
		const imageId = requireNumeric(params.id, 'image id');
		const teacherId = requireNumeric(request.headers.get('x-teacher-id'), 'x-teacher-id');

		const usage = normaliseResult(
			await runQuery(
				fetch,
				`SELECT id
				 FROM questions
				 WHERE image_references LIKE '%"${imageId}"%'`
			)
		);

		if (usage.length > 0) {
			return json(
				{ error: `Cannot delete image: it is used in ${usage.length} question(s)` },
				{ status: 400 }
			);
		}

		const result = normaliseResult(
			await runQuery(
				fetch,
				`DELETE FROM images
				 WHERE id = ${imageId} AND uploaded_by = ${teacherId}
				 RETURNING id`
			)
		);

		if (result.length === 0) {
			return json({ error: 'Image not found or access denied' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to delete image' },
			{ status: error?.status ?? 500 }
		);
	}
}
