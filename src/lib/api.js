const BASE_URL = '/api';

function escapeSql(str) {
	if (typeof str !== 'string') return str;
	return str.replace(/'/g, "''");
}

function validateNumeric(value) {
	if (!/^\d+$/.test(String(value))) {
		throw new Error(`Invalid numeric value: ${value}`);
	}
	return Number(value);
}

function validateBoolean(value) {
	if (typeof value !== 'boolean') {
		throw new Error(`Invalid boolean value: ${value}`);
	}
	return value;
}

function validateString(value) {
	if (typeof value !== 'string') {
		throw new Error(`Invalid string value: ${value}`);
	}
	return value;
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

export async function uploadTestSpreadsheet(fetch, { file, title, teacherId }) {
	validateString(title);
	validateNumeric(teacherId);

	const form = new FormData();
	form.append('file', file);
	form.append('title', title);
	form.append('teacher_id', teacherId);
	const res = await fetch(`${BASE_URL}/tests/upload`, {
		method: 'POST',
		body: form
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function assignTest(fetch, { testId, studentId, studentName }) {
	const cleanTestId = validateNumeric(testId);
	const cleanStudentId = validateNumeric(studentId);
	const cleanStudentName = validateString(studentName);

	const sql = `INSERT INTO test_attempts (test_id, student_id, student_name)
                VALUES (${cleanTestId}, ${cleanStudentId}, '${escapeSql(cleanStudentName)}')
                RETURNING id`;
	return query(fetch, sql);
}

export async function setTestActive(fetch, { testId, teacherId, isActive }) {
	const cleanTestId = validateNumeric(testId);
	const cleanTeacherId = validateNumeric(teacherId);
	const cleanIsActive = validateBoolean(isActive);

	const sql = `UPDATE tests SET is_active = ${
		cleanIsActive ? 'TRUE' : 'FALSE'
	} WHERE id = ${cleanTestId} AND teacher_id = ${cleanTeacherId}`;
	return query(fetch, sql);
}

export async function getTeacherResults(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const sql = `SELECT ta.student_name, ta.score, ta.completed_at, t.title FROM test_attempts ta JOIN tests t ON t.id = ta.test_id WHERE t.teacher_id = ${cleanTeacherId}`;
	return query(fetch, sql);
}

export async function getStudentResults(fetch, studentId) {
	const cleanStudentId = validateNumeric(studentId);
	const sql = `SELECT t.title, ta.score, ta.completed_at FROM test_attempts ta JOIN tests t ON t.id = ta.test_id WHERE ta.student_id = ${cleanStudentId}`;
	return query(fetch, sql);
}

export async function addTeacher(fetch, { name, pin }) {
	const cleanName = validateString(name);
	const cleanPin = validateNumeric(pin);
	const sql = `INSERT INTO teachers (name, pin) VALUES ('${escapeSql(
		cleanName
	)}', '${escapeSql(cleanPin)}')`;
	return query(fetch, sql);
}

export async function addStudent(fetch, { name, pin }) {
	const cleanName = validateString(name);
	const cleanPin = validateNumeric(pin);
	const sql = `INSERT INTO students (name, pin) VALUES ('${escapeSql(
		cleanName
	)}', '${escapeSql(cleanPin)}')`;
	return query(fetch, sql);
}

export async function updateQuestion(fetch, { questionId, text, teacherId }) {
	const cleanQuestionId = validateNumeric(questionId);
	const cleanText = validateString(text);
	const cleanTeacherId = validateNumeric(teacherId);
	const sql = `UPDATE questions SET question_text = '${escapeSql(
		cleanText
	)}' WHERE id = ${cleanQuestionId} AND EXISTS (SELECT 1 FROM tests t WHERE t.id = questions.test_id AND t.teacher_id = ${cleanTeacherId})`;
	return query(fetch, sql);
}

export async function updateChoice(fetch, { choiceId, text, isCorrect, teacherId }) {
	const cleanChoiceId = validateNumeric(choiceId);
	const cleanText = validateString(text);
	const cleanIsCorrect = validateBoolean(isCorrect);
	const cleanTeacherId = validateNumeric(teacherId);
	const sql = `UPDATE choices SET choice_text = '${escapeSql(
		cleanText
	)}', is_correct = ${
		cleanIsCorrect ? 'TRUE' : 'FALSE'
	} WHERE id = ${cleanChoiceId} AND EXISTS (SELECT 1 FROM questions q JOIN tests t ON q.test_id = t.id WHERE q.id = choices.question_id AND t.teacher_id = ${cleanTeacherId})`;
	return query(fetch, sql);
}
