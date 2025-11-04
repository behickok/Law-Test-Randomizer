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

export async function GET({ params, fetch }) {
	try {
		const assignmentId = requireNumeric(params.id, 'assignmentId');

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT q.id as question_id,
				        q.question_text,
				        q.points,
				        COUNT(qr.id) as total_reviews,
				        COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) as completed_reviews,
				        ROUND(AVG(qr.rating), 2) as avg_rating,
				        ROUND(AVG(qr.difficulty_rating), 2) as avg_difficulty,
				        ROUND(AVG(qr.clarity_rating), 2) as avg_clarity,
				        ROUND(AVG(qr.relevance_rating), 2) as avg_relevance,
				        STRING_AGG(qr.feedback, ' | ') as all_feedback,
				        STRING_AGG(qr.suggestions, ' | ') as all_suggestions,
				        STRING_AGG(r.name, ', ') as reviewer_names
				 FROM questions q
				 JOIN question_reviews qr ON q.id = qr.question_id
				 JOIN reviewers r ON qr.reviewer_id = r.id
				 WHERE qr.assignment_id = ${assignmentId}
				   AND qr.status = 'completed'
				   AND (qr.rating IS NOT NULL OR qr.feedback IS NOT NULL OR qr.suggestions IS NOT NULL)
				 GROUP BY q.id, q.question_text, q.points
				 HAVING COUNT(qr.id) > 0
				 ORDER BY avg_rating ASC NULLS LAST, q.id`
			)
		);

		return json({ results: rows });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load review results' },
			{ status: error?.status ?? 500 }
		);
	}
}
