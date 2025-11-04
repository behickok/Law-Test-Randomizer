import { json } from '@sveltejs/kit';
import { runQueryFile } from '$lib/server/db';

export async function POST({ request, fetch }) {
	const formData = await request.formData();
	try {
		const data = await runQueryFile(fetch, formData);
		return json(data);
	} catch (error) {
		return new Response(error.message ?? 'Query file upload failed', {
			status: error.status ?? 500
		});
	}
}
