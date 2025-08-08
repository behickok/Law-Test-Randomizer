import { fail } from '@sveltejs/kit';
import { query, uploadSQL } from '$lib/api';

export async function load({ fetch }) {
	try {
		const res = await query(fetch, 'select id, title, description, is_active from tests');
		const tests = Array.isArray(res) ? res : (res?.data ?? []);
		return { tests };
	} catch {
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
