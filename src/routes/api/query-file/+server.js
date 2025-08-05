import { PASSPHRASE } from '$env/dynamic/private';

const BASE_URL = 'https://web-production-b1513.up.railway.app';

export async function POST({ request }) {
	const formData = await request.formData();
	const res = await fetch(`${BASE_URL}/query-file`, {
		method: 'POST',
		headers: {
			...(PASSPHRASE ? { Authorization: `Bearer ${PASSPHRASE}` } : {})
		},
		body: formData
	});
	const text = await res.text();
	return new Response(text, {
		status: res.status,
		headers: { 'Content-Type': 'application/json' }
	});
}
