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

export async function PUT({ params, request, locals }) {
        try {
                const teacher = requireTeacher(locals);
                const assignmentId = requireNumeric(params.id, 'assignmentId');
                const body = await request.json();
                const title =
                        typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : null;
                const description =
			typeof body?.description === 'string' ? body.description.trim() : '';

		if (!title) {
			return json({ error: 'title is required' }, { status: 400 });
		}

                await runQuery(locals.db,
                        `UPDATE review_assignments
                         SET title = '${escapeSql(title)}',
                             description = '${escapeSql(description)}'
                         WHERE id = ${assignmentId} AND assigner_id = ${teacher.id}`
                );

                return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to update review assignment' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function PATCH({ params, request, locals }) {
        try {
                const teacher = requireTeacher(locals);
                const assignmentId = requireNumeric(params.id, 'assignmentId');
                const body = await request.json();
                const status =
                        typeof body?.status === 'string' && body.status.trim() ? body.status.trim() : null;

		if (!['active', 'completed', 'cancelled'].includes(status)) {
			return json(
				{ error: 'Invalid status. Must be active, completed, or cancelled.' },
				{ status: 400 }
			);
		}

		const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';

                await runQuery(locals.db,
                        `UPDATE review_assignments
                         SET status = '${status}', completed_at = ${completedAt}
                         WHERE id = ${assignmentId} AND assigner_id = ${teacher.id}`
                );

                return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to update review assignment status' },
			{ status: error?.status ?? 500 }
		);
	}
}

export async function DELETE({ params, locals }) {
        try {
                const teacher = requireTeacher(locals);
                const assignmentId = requireNumeric(params.id, 'assignmentId');

                await runQuery(locals.db,
			`DELETE FROM question_reviews WHERE assignment_id = ${assignmentId}`
		);

                const deleted = normaliseResult(
                        await runQuery(locals.db,
                                `DELETE FROM review_assignments
                                 WHERE id = ${assignmentId} AND assigner_id = ${teacher.id}
                                 RETURNING id`
                        )
                );

		if (deleted.length === 0) {
			return json({ error: 'Assignment not found or access denied' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		return json(
			{ error: error?.message ?? 'Failed to delete review assignment' },
			{ status: error?.status ?? 500 }
		);
	}
}
