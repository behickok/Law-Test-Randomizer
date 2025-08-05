const BASE_URL = '/api';

function escapeSql(str) {
        return str.replace(/'/g, "''");
}

export async function query(fetch, sql) {
	const res = await fetch(`${BASE_URL}/query`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ sql })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function uploadSQL(fetch, file) {
	const form = new FormData();
	form.append('sql_file', file);
	const res = await fetch(`${BASE_URL}/query-file`, {
		method: 'POST',
		body: form
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function uploadTestSpreadsheet(fetch, { file, title, teacherPin }) {
	const form = new FormData();
	form.append('file', file);
	form.append('title', title);
	form.append('teacher_pin', teacherPin);
	const res = await fetch(`${BASE_URL}/tests/upload`, {
		method: 'POST',
		body: form
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function assignTest(fetch, { testId, studentName, studentPin }) {
        const sql = `INSERT INTO test_attempts (test_id, student_name, student_pin)
                SELECT ${testId}, '${escapeSql(studentName)}', '${escapeSql(studentPin)}'
                WHERE EXISTS (SELECT 1 FROM students WHERE pin = '${escapeSql(studentPin)}')
                RETURNING id`;
        const res = await query(fetch, sql);
        if (!Array.isArray(res) || res.length === 0) {
                throw new Error('Student not found');
        }
        return res;
}

export async function setTestActive(fetch, { testId, teacherPin, isActive }) {
	const sql = `UPDATE tests SET is_active = ${isActive ? 'TRUE' : 'FALSE'} WHERE id = ${testId} AND teacher_pin = '${teacherPin}'`;
	return query(fetch, sql);
}

export async function getTeacherResults(fetch, teacherPin) {
	const sql = `SELECT ta.student_name, ta.score, ta.completed_at, t.title FROM test_attempts ta JOIN tests t ON t.id = ta.test_id WHERE t.teacher_pin = '${teacherPin}'`;
	return query(fetch, sql);
}

export async function getStudentResults(fetch, studentPin) {
        const sql = `SELECT t.title, ta.score, ta.completed_at FROM test_attempts ta JOIN tests t ON t.id = ta.test_id WHERE ta.student_pin = '${studentPin}'`;
        return query(fetch, sql);
}

export async function addTeacher(fetch, { name, pin }) {
        const sql = `INSERT INTO teachers (name, pin) VALUES ('${escapeSql(name)}', '${escapeSql(pin)}')`;
        return query(fetch, sql);
}

export async function addStudent(fetch, { name, pin }) {
        const sql = `INSERT INTO students (name, pin) VALUES ('${escapeSql(name)}', '${escapeSql(pin)}')`;
        return query(fetch, sql);
}

export async function updateQuestion(fetch, { questionId, text, teacherPin }) {
        const sql = `UPDATE questions SET question_text = '${text}' WHERE id = ${questionId} AND EXISTS (SELECT 1 FROM tests t WHERE t.id = questions.test_id AND t.teacher_pin = '${teacherPin}')`;
        return query(fetch, sql);
}

export async function updateChoice(fetch, { choiceId, text, isCorrect, teacherPin }) {
        const sql = `UPDATE choices SET choice_text = '${text}', is_correct = ${isCorrect ? 'TRUE' : 'FALSE'} WHERE id = ${choiceId} AND EXISTS (SELECT 1 FROM questions q JOIN tests t ON q.test_id = t.id WHERE q.id = choices.question_id AND t.teacher_pin = '${teacherPin}')`;
        return query(fetch, sql);
}
