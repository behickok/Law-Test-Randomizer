import { json } from '@sveltejs/kit';
import {
	clearSessionCookieOptions,
	destroySession,
	getSessionCookieName
} from '$lib/server/session';

export async function POST({ cookies, locals }) {
	const cookieName = getSessionCookieName();
	let sessionId = locals?.sessionId;
	if (!sessionId) {
		const cookie = cookies.get(cookieName);
		if (cookie) {
			const [id] = cookie.split('.');
			sessionId = id;
		}
	}

	if (sessionId) {
		await destroySession(locals.db, sessionId);
	}

	cookies.delete(cookieName, clearSessionCookieOptions());

	return json({ success: true });
}
