import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { runQuery, normaliseResult } from '$lib/server/db';
import { hashPin, pinExists } from '$lib/server/pin';
import {
	createSession,
	getSessionCookieName,
	getSessionCookieOptions,
	makeSessionCookieValue
} from '$lib/server/session';

async function ensureUniqueReviewerEmail(fetch, email) {
        const checks = normaliseResult(
                await runQuery(fetch, {
                        text: `SELECT 1 FROM reviewers WHERE email = $1 LIMIT 1`,
                        values: [email]
                })
        );
	if (checks.length > 0) {
		const error = new Error('Email already exists. Please choose a different email.');
		error.status = 400;
		throw error;
	}
}

export async function POST({ request, fetch, cookies }) {
	try {
		const body = await request.json();
		const role = body?.role;
		const name = typeof body?.name === 'string' ? body.name.trim() : '';
		const email = typeof body?.email === 'string' ? body.email.trim() : '';
		const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';
		const inviteCode =
			typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : '';

		if (!role || !['teacher', 'student', 'reviewer'].includes(role)) {
			return json({ error: 'Unsupported role' }, { status: 400 });
		}

		if (!name) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		if (!/^\d+$/.test(pin)) {
			return json({ error: 'PIN must be numeric' }, { status: 400 });
		}

		if (pin.length < 4) {
			return json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
		}

		if (await pinExists(fetch, pin)) {
			return json({ error: 'PIN already exists. Please choose a different PIN.' }, { status: 400 });
		}

		let rows = [];
		let inviteDetails = null;
		if (role === 'reviewer' && inviteCode) {
                        const inviteRows = normaliseResult(
                                await runQuery(fetch, {
                                        text: `SELECT reviewer_email, reviewer_name
                                         FROM reviewer_invitations
                                         WHERE invite_code = $1
                                           AND status = 'pending'
                                         LIMIT 1`,
                                        values: [inviteCode]
                                })
                        );
			if (inviteRows.length === 0) {
				return json({ error: 'Invalid or expired invitation code.' }, { status: 400 });
			}
			inviteDetails = inviteRows[0];
		}

		if (role === 'teacher') {
                        const hashedPin = hashPin(pin);
                        const invite = randomUUID();
                        rows = normaliseResult(
                                await runQuery(fetch, {
                                        text: `INSERT INTO teachers (name, pin, invite_code)
                                         VALUES ($1, $2, $3)
                                         RETURNING id, name, 'teacher' as role`,
                                        values: [name, hashedPin, invite]
                                })
                        );
                } else if (role === 'student') {
                        const hashedPin = hashPin(pin);
                        rows = normaliseResult(
                                await runQuery(fetch, {
                                        text: `INSERT INTO students (name, pin)
                                         VALUES ($1, $2)
                                         RETURNING id, name, 'student' as role`,
                                        values: [name, hashedPin]
                                })
                        );
                } else if (role === 'reviewer') {
                        if (!inviteDetails && !email) {
                                return json({ error: 'Email is required for reviewers' }, { status: 400 });
                        }

                        const reviewerEmail = inviteDetails ? inviteDetails.reviewer_email : email;

                        await ensureUniqueReviewerEmail(fetch, reviewerEmail);

                        const hashedPin = hashPin(pin);
                        const reviewerInviteCode = inviteDetails ? inviteCode : randomUUID();
                        rows = normaliseResult(
                                await runQuery(fetch, {
                                        text: `INSERT INTO reviewers (name, email, pin, invite_code, is_active)
                                         VALUES ($1, $2, $3, $4, TRUE)
                                         RETURNING id, name, email, 'reviewer' as role`,
                                        values: [name, reviewerEmail, hashedPin, reviewerInviteCode]
                                })
                        );

                        if (inviteDetails) {
                                await runQuery(fetch, {
                                        text: `UPDATE reviewer_invitations
                                         SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
                                         WHERE invite_code = $1`,
                                        values: [inviteCode]
                                });
                        }
                }

		if (rows.length === 0) {
			return json({ error: 'Signup failed' }, { status: 500 });
		}

		const userPayload = rows[0];
		const sessionRecord = await createSession(fetch, userPayload);
		cookies.set(
			getSessionCookieName(),
			makeSessionCookieValue(sessionRecord),
			{
				...getSessionCookieOptions(),
				expires: sessionRecord.expiresAt
			}
		);

		return json({ user: userPayload });
	} catch (error) {
		return json(
			{ error: error?.message || 'Signup failed' },
			{ status: error?.status ?? 500 }
		);
	}
}
