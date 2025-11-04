import { json } from '@sveltejs/kit';
import { escapeSql, runQuery, normaliseResult } from '$lib/server/db';

const ROLE_CONFIG = {
	teacher: {
		table: 'teachers',
		fields: "id, name, 'teacher' as role"
	},
	student: {
		table: 'students',
		fields: "id, name, 'student' as role"
	},
	reviewer: {
		table: 'reviewers',
		fields: "id, name, email, 'reviewer' as role",
		condition: 'AND is_active = TRUE'
	}
};

export async function POST({ request, fetch }) {
	try {
		const body = await request.json();
		const role = body?.role;
		const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';

		if (!ROLE_CONFIG[role]) {
			return json({ error: 'Unsupported role' }, { status: 400 });
		}

		if (!/^\d+$/.test(pin)) {
			return json({ error: 'PIN must be numeric' }, { status: 400 });
		}

		const { table, fields, condition = '' } = ROLE_CONFIG[role];
		const rows = normaliseResult(
			await runQuery(
				fetch,
				`SELECT ${fields} FROM ${table} WHERE pin = '${escapeSql(pin)}' ${condition}`
			)
		);

		if (rows.length === 0) {
			return json({ error: 'Invalid credentials' }, { status: 401 });
		}

		return json({ user: rows[0] });
	} catch (error) {
		return json(
			{ error: error?.message || 'Login failed' },
			{ status: error?.status ?? 500 }
		);
	}
}
