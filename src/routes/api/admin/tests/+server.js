import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';
import { requireTeacher } from '$lib/server/authz';

export async function GET({ locals }) {
	try {
		requireTeacher(locals);
		const rows = normaliseResult(
			await runQuery(locals.db,
				`SELECT t.id,
				        t.title,
				        t.description,
				        t.is_active,
				        t.teacher_id,
				        te.name AS teacher_name
				 FROM tests t
				 JOIN teachers te ON t.teacher_id = te.id
				 ORDER BY te.name, t.title`
			)
		);
		return json({ tests: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load tests' },
			{ status: error?.status ?? 500 }
		);
	}
}
