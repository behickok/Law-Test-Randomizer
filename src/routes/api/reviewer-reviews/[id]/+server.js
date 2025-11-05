import { json } from '@sveltejs/kit';
import { escapeSql, runQuery } from '$lib/server/db';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export async function POST({params, request, locals}) {
	try {
		const reviewId = requireNumeric(params.id, 'reviewId');
		const body = await request.json();

		const rating =
			body?.rating === null || body?.rating === undefined
				? null
				: requireNumeric(body.rating, 'rating');
		const difficulty =
			body?.difficultyRating === null || body?.difficultyRating === undefined
				? null
				: requireNumeric(body.difficultyRating, 'difficultyRating');
		const clarity =
			body?.clarityRating === null || body?.clarityRating === undefined
				? null
				: requireNumeric(body.clarityRating, 'clarityRating');
		const relevance =
			body?.relevanceRating === null || body?.relevanceRating === undefined
				? null
				: requireNumeric(body.relevanceRating, 'relevanceRating');
		const feedback =
			typeof body?.feedback === 'string' && body.feedback.trim()
				? escapeSql(body.feedback.trim())
				: null;
		const suggestions =
			typeof body?.suggestions === 'string' && body.suggestions.trim()
				? escapeSql(body.suggestions.trim())
				: null;

		await runQuery(locals.db,
			`UPDATE question_reviews
			 SET rating = ${rating ?? 'NULL'},
			     feedback = ${feedback ? `'${feedback}'` : 'NULL'},
			     suggestions = ${suggestions ? `'${suggestions}'` : 'NULL'},
			     difficulty_rating = ${difficulty ?? 'NULL'},
			     clarity_rating = ${clarity ?? 'NULL'},
			     relevance_rating = ${relevance ?? 'NULL'},
			     status = 'completed',
			     completed_at = CURRENT_TIMESTAMP
			 WHERE id = ${reviewId}`
		);

		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to submit review' },
			{ status: error?.status ?? 500 }
		);
	}
}
