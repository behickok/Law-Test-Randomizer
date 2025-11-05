import {
	clearSessionCookieOptions,
	destroySession,
	getSessionCookieName,
	readSession
} from '$lib/server/session';

export const handle = async ({ event, resolve }) => {
	const database = event.platform?.env?.DB ?? null;
	if (!database) {
		throw new Error('[hooks] Missing Cloudflare D1 binding `DB`. Configure it for this environment.');
	}
	event.locals.db = database;

	const cookieName = getSessionCookieName();
	const sessionCookie = event.cookies.get(cookieName);
	let session = null;

	if (sessionCookie) {
		session = await readSession(database, sessionCookie);
	}

	if (session?.user) {
		event.locals.user = session.user;
		event.locals.sessionId = session.id;
	} else {
		if (sessionCookie) {
			await destroySession(database, session?.id);
			event.cookies.delete(cookieName, clearSessionCookieOptions());
		}
		event.locals.user = null;
		event.locals.sessionId = null;
	}

	return resolve(event);
};
