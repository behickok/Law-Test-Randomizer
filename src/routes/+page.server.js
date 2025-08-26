import { fail } from '@sveltejs/kit';
import { uploadSQL } from '$lib/api';


export async function load() {
	return { tests: [] };

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
