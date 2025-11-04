import {
	clearSessionCookieOptions,
	destroySession,
	getSessionCookieName,
	readSession
} from '$lib/server/session';

export const handle = async ({ event, resolve }) => {
	const cookieName = getSessionCookieName();
	const sessionCookie = event.cookies.get(cookieName);
	let session = null;

	if (sessionCookie) {
		session = await readSession(event.fetch, sessionCookie);
	}

	if (session?.user) {
		event.locals.user = session.user;
		event.locals.sessionId = session.id;
	} else {
		if (sessionCookie) {
			await destroySession(event.fetch, session?.id);
			event.cookies.delete(cookieName, clearSessionCookieOptions());
		}
		event.locals.user = null;
		event.locals.sessionId = null;
	}

	return resolve(event);
};
