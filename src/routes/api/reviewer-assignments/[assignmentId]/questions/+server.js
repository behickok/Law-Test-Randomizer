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

export async function GET({ params, request, fetch }) {
	try {
		const assignmentId = requireNumeric(params.assignmentId, 'assignmentId');
		const url = new URL(request.url);
		const reviewerParam = url.searchParams.get('reviewerId');
		if (!reviewerParam) {
			return json({ error: 'reviewerId query param is required' }, { status: 400 });
		}
		const reviewerId = requireNumeric(reviewerParam, 'reviewerId');

		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT qr.id as review_id,
				        q.id as question_id,
				        q.question_text,
				        q.points,
				        c.id as choice_id,
				        c.choice_text,
				        c.is_correct,
				        qr.status as review_status,
				        qr.rating,
				        qr.feedback,
				        qr.suggestions,
				        qr.difficulty_rating,
				        qr.clarity_rating,
				        qr.relevance_rating
				 FROM question_reviews qr
				 JOIN questions q ON qr.question_id = q.id
				 LEFT JOIN choices c ON q.id = c.question_id
				 WHERE qr.reviewer_id = ${reviewerId}
				   AND qr.assignment_id = ${assignmentId}
				 ORDER BY q.id, c.id`
			)
		);

		const questionsMap = new Map();
		for (const row of rows) {
			if (!questionsMap.has(row.question_id)) {
				questionsMap.set(row.question_id, {
					reviewId: row.review_id,
					questionId: row.question_id,
					questionText: row.question_text,
					points: row.points,
					reviewStatus: row.review_status,
					rating: row.rating,
					feedback: row.feedback,
					suggestions: row.suggestions,
					difficultyRating: row.difficulty_rating,
					clarityRating: row.clarity_rating,
					relevanceRating: row.relevance_rating,
					choices: []
				});
			}
			if (row.choice_id) {
				questionsMap.get(row.question_id).choices.push({
					id: row.choice_id,
					text: row.choice_text,
					isCorrect: row.is_correct
				});
			}
		}

		return json({ questions: Array.from(questionsMap.values()) });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to load questions for review' },
			{ status: error?.status ?? 500 }
		);
	}
}
