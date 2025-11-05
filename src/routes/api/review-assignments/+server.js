import { json } from '@sveltejs/kit';
import { escapeSql, normaliseResult, runQuery } from '$lib/server/db';
import { requireTeacher } from '$lib/server/authGuard';

function requireNumeric(value, field) {
	if (!/^\d+$/.test(String(value ?? ''))) {
		const error = new Error(`${field} must be numeric`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

function requireString(value, field) {
	if (typeof value !== 'string' || !value.trim()) {
		const error = new Error(`${field} is required`);
		error.status = 400;
		throw error;
	}
	return value.trim();
}

export async function GET({ request, locals }) {
        try {
                const teacher = requireTeacher(locals);
                const url = new URL(request.url);
                const includeAll = url.searchParams.get('all') === 'true';

                if (includeAll) {
                        return json(
                                { error: 'Global review assignment listing requires elevated access' },
                                { status: 403 }
                        );
                }

                const rows = normaliseResult(
                        await runQuery(locals.db,
                                `SELECT *
                                 FROM review_summary
                                 WHERE assigner_id = ${teacher.id}
                                 ORDER BY created_at DESC`
                        )
                );

                return json({ assignments: rows });
        } catch (error) {
                return json(
			{ error: error?.message ?? 'Failed to load review assignments' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function POST({ request, locals }) {
        try {
                const teacher = requireTeacher(locals);
                const body = await request.json();
                const testId = requireNumeric(body?.testId, 'testId');
                const title = requireString(body?.title, 'title');
                const description = typeof body?.description === 'string' ? body.description.trim() : '';
                const reviewers = Array.isArray(body?.reviewers) ? body.reviewers : [];
                const questionsPerReviewer = requireNumeric(
                        body?.questionsPerReviewer ?? 40,
			'questionsPerReviewer'
		);
		const overlapFactor = requireNumeric(body?.overlapFactor ?? 2, 'overlapFactor');

		if (reviewers.length === 0) {
			return json({ error: 'At least one reviewer must be selected' }, { status: 400 });
		}

                const reviewerIds = reviewers.map((id) => requireNumeric(id, 'reviewerId'));

                const testCheck = normaliseResult(
                        await runQuery(locals.db,
                                `SELECT id
                                 FROM tests
                                 WHERE id = ${testId} AND teacher_id = ${teacher.id}
                                 LIMIT 1`
                        )
                );
                if (testCheck.length === 0) {
                        return json({ error: 'Test not found or access denied' }, { status: 404 });
                }

                // Verify reviewers
                const reviewerCheck = normaliseResult(
                        await runQuery(locals.db,
				`SELECT id
				 FROM reviewers
				 WHERE id IN (${reviewerIds.join(',')})
				   AND is_active = TRUE`
			)
		);
		if (reviewerCheck.length !== reviewerIds.length) {
			return json({ error: 'One or more selected reviewers are not valid' }, { status: 400 });
		}

		// Create assignment
                const assignmentRes = normaliseResult(
                        await runQuery(locals.db,
                                `INSERT INTO review_assignments (test_id, assigner_id, title, description, questions_per_reviewer, overlap_factor)
                                 VALUES (${testId}, ${teacher.id}, '${escapeSql(title)}', '${escapeSql(description)}', ${questionsPerReviewer}, ${overlapFactor})
                                 RETURNING id`
                        )
                );
		const assignmentId = assignmentRes[0]?.id;
		if (!assignmentId) {
			return json({ error: 'Failed to create review assignment' }, { status: 500 });
		}

		const questions = normaliseResult(
			await runQuery(locals.db,
				`SELECT id
				 FROM questions
				 WHERE test_id = ${testId}
				 ORDER BY id`
			)
		);
		if (questions.length === 0) {
			return json({ error: 'No questions found for this test' }, { status: 400 });
		}

		// Distribute questions
		const assignments = distributeQuestions(
			questions.map((q) => q.id),
			reviewerIds,
			questionsPerReviewer,
			overlapFactor
		);

		if (assignments.length === 0) {
			return json({ error: 'Unable to distribute questions to reviewers' }, { status: 400 });
		}

		const insertValues = assignments
			.map(
				({ questionId, reviewerId }) =>
					`(${questionId}, ${reviewerId}, ${assignmentId})`
			)
			.join(', ');

		await runQuery(locals.db,
			`INSERT INTO question_reviews (question_id, reviewer_id, assignment_id)
			 VALUES ${insertValues}`
		);

		return json({
			success: true,
			assignmentId,
			questionsAssigned: assignments.length,
			message: `Review assignment created with ${assignments.length} question reviews distributed among ${reviewerIds.length} reviewers`
		});
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to create review assignment' },
			{ status: error?.status ?? 500 }
		);
	}
}

function distributeQuestions(questions, reviewers, questionsPerReviewer, overlapFactor) {
	const assignments = [];
	const counts = new Map(reviewers.map((id) => [id, 0]));

	for (const questionId of questions) {
		let assigned = 0;
		const sortedReviewers = reviewers
			.slice()
			.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));

		for (const reviewerId of sortedReviewers) {
			if (assigned >= overlapFactor) break;
			if ((counts.get(reviewerId) ?? 0) >= questionsPerReviewer) continue;

			assignments.push({ questionId, reviewerId });
			counts.set(reviewerId, (counts.get(reviewerId) ?? 0) + 1);
			assigned += 1;
		}
	}

	return assignments;
}
