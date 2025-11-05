import { fail } from '@sveltejs/kit';
import { runQueryFile } from '$lib/server/db';

export async function load() {
	return { tests: [] };
}

export const actions = {
	upload: async ({ request, locals }) => {
		const formData = await request.formData();
		const file = formData.get('sql_file');
		if (!file) {
			return fail(400, { error: 'No file provided' });
		}
                try {
                        await runQueryFile(locals.db, file);
                        return { success: true };
                } catch {
                        return fail(400, { error: 'Upload failed' });
		}
	}
};
