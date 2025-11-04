import { json } from '@sveltejs/kit';
import { normaliseResult, runQuery } from '$lib/server/db';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function GET({ request, fetch }) {
	try {
		const url = new URL(request.url);
		const reviewerParam = url.searchParams.get('reviewerId');
		if (!reviewerParam) {
			return json({ error: 'reviewerId query param is required' }, { status: 400 });
		}
		const reviewerId = requireNumeric(reviewerParam, 'reviewerId');

		const reviewerExists = normaliseResult(
			await runQuery(
				fetch,
				`SELECT id
				 FROM reviewers
				 WHERE id = ${reviewerId} AND is_active = TRUE
				 LIMIT 1`
			)
		);
		if (reviewerExists.length === 0) {
			return json({ error: 'Invalid reviewer ID' }, { status: 400 });
		}

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT DISTINCT ra.id,
				        ra.title,
				        ra.description,
				        t.title as test_title,
				        teacher.name as assigner_name,
				        ra.created_at,
				        COUNT(qr.id) as total_questions,
				        COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) as completed_questions
				 FROM review_assignments ra
				 JOIN tests t ON ra.test_id = t.id
				 JOIN teachers teacher ON ra.assigner_id = teacher.id
				 JOIN question_reviews qr ON ra.id = qr.assignment_id
				 WHERE qr.reviewer_id = ${reviewerId}
				   AND ra.status = 'active'
				 GROUP BY ra.id, ra.title, ra.description, t.title, teacher.name, ra.created_at
				 ORDER BY ra.created_at DESC`
			)
		);

		return json({ assignments: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load reviewer assignments' },
			{ status: error?.status ?? 500 }
		);
	}
}
