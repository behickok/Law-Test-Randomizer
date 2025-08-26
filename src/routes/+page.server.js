import { fail } from '@sveltejs/kit';
import { query, uploadSQL } from '$lib/api';

export async function load({ fetch, locals }) {
	try {
		if (!locals.user) {
			return { tests: [] };
		}
		let query_string = 'select id, title, description, is_active from tests';
		if (locals.user.role === 'teacher') {
			query_string += ` where teacher_id = ${locals.user.id}`;
		} else {
			query_string += ' where is_active = true';
		}
		const res = await query(fetch, query_string);
		const tests = Array.isArray(res) ? res : res?.data ?? [];
		return { tests };
	} catch (e) {
		console.log(e);
		return { tests: [], error: 'Failed to load tests' };
	}
}

export const actions = {
	upload: async ({ request, fetch }) => {
		const formData = await request.formData();
		const file = formData.get('sql_file');
		if (!file) {
			return fail(400, { error: 'No file provided' });
		}
		try {
			await uploadSQL(fetch, file);
			return { success: true };
		} catch {
			return fail(400, { error: 'Upload failed' });
		}
	}
};
