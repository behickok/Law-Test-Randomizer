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
	if (!file) {
		throw new Error('File is required');
	}

	const derivedTitle = title?.trim() || file.name.replace(/\.[^/.]+$/, '');
	const cleanTitle = validateString(derivedTitle);
	const cleanTeacherId = validateNumeric(teacherId);

	const form = new FormData();
	form.append('file', file);
	form.append('title', cleanTitle);
	form.append('teacher_id', cleanTeacherId);
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
	const sql = `SELECT ta.id, ta.student_name, ta.score, ta.completed_at, t.title FROM test_attempts ta JOIN tests t ON t.id = ta.test_id WHERE t.teacher_id = ${cleanTeacherId}`;
	return query(fetch, sql);
}

export async function getAttemptAnswers(fetch, attemptId) {
	const cleanAttemptId = validateNumeric(attemptId);
	const sql = `SELECT q.question_text, c.choice_text, aa.is_correct FROM attempt_answers aa JOIN questions q ON q.id = aa.question_id JOIN choices c ON c.id = aa.choice_id WHERE aa.attempt_id = ${cleanAttemptId}`;
	return query(fetch, sql);
}

export async function getStudentResults(fetch, studentId) {
	const cleanStudentId = validateNumeric(studentId);
	const sql = `SELECT t.id AS test_id, t.title, ta.score, ta.completed_at FROM test_attempts ta JOIN tests t ON t.id = ta.test_id WHERE ta.student_id = ${cleanStudentId}`;
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

export async function addStudent(fetch, { name, pin, teacherId }) {
	const cleanName = validateString(name);
	const cleanPin = validateNumeric(pin);
	const insertSql = `INSERT INTO students (name, pin) VALUES ('${escapeSql(
		cleanName
	)}', '${escapeSql(cleanPin)}') RETURNING id`;
	const res = await query(fetch, insertSql);
	const studentId = Array.isArray(res) ? res[0]?.id : res?.data?.[0]?.id;
	if (teacherId !== undefined) {
		const cleanTeacherId = validateNumeric(teacherId);
		await query(
			fetch,
			`INSERT INTO classes (teacher_id, student_id) VALUES (${cleanTeacherId}, ${studentId})`
		);
	}
	return res;
}

export async function getClassStudents(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const sql = `SELECT s.id, s.name FROM classes c JOIN students s ON s.id = c.student_id WHERE c.teacher_id = ${cleanTeacherId} AND c.status = 'active'`;
	return query(fetch, sql);
}

export async function requestClassJoin(fetch, { studentId, teacherPin }) {
	const cleanStudentId = validateNumeric(studentId);
	const cleanTeacherPin = validateNumeric(teacherPin);
	const sql = `INSERT INTO classes (teacher_id, student_id, status) SELECT id, ${cleanStudentId}, 'pending' FROM teachers WHERE pin = '${escapeSql(cleanTeacherPin)}' ON CONFLICT (teacher_id, student_id) DO UPDATE SET status = 'pending'`;
	return query(fetch, sql);
}

export async function getPendingStudents(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const sql = `SELECT s.id, s.name FROM classes c JOIN students s ON s.id = c.student_id WHERE c.teacher_id = ${cleanTeacherId} AND c.status = 'pending'`;
	return query(fetch, sql);
}

export async function approveStudent(fetch, { teacherId, studentId }) {
	const cleanTeacherId = validateNumeric(teacherId);
	const cleanStudentId = validateNumeric(studentId);
	const sql = `UPDATE classes SET status = 'active' WHERE teacher_id = ${cleanTeacherId} AND student_id = ${cleanStudentId}`;
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
	const sql = `UPDATE choices SET choice_text = '${escapeSql(cleanText)}', is_correct = ${
		cleanIsCorrect ? 'TRUE' : 'FALSE'
	} WHERE id = ${cleanChoiceId} AND EXISTS (SELECT 1 FROM questions q JOIN tests t ON q.test_id = t.id WHERE q.id = choices.question_id AND t.teacher_id = ${cleanTeacherId})`;
	return query(fetch, sql);
}

export async function submitAttempt(fetch, { testId, studentId, studentName, answers, score }) {
	const cleanTestId = validateNumeric(testId);
	const cleanStudentId = validateNumeric(studentId);
	const cleanStudentName = validateString(studentName);
	const cleanScore = validateNumeric(score);

	const attemptRes = await query(
		fetch,
		`SELECT id FROM test_attempts WHERE test_id = ${cleanTestId} AND student_id = ${cleanStudentId} ORDER BY started_at DESC LIMIT 1`
	);
	const attemptId = Array.isArray(attemptRes) ? attemptRes[0]?.id : attemptRes?.data?.[0]?.id;

	let id = attemptId;
	if (!id) {
		const insertRes = await query(
			fetch,
			`INSERT INTO test_attempts (test_id, student_id, student_name) VALUES (${cleanTestId}, ${cleanStudentId}, '${escapeSql(cleanStudentName)}') RETURNING id`
		);
		id = Array.isArray(insertRes) ? insertRes[0]?.id : insertRes?.data?.[0]?.id;
	} else {
		await query(
			fetch,
			`UPDATE test_attempts SET student_name = '${escapeSql(cleanStudentName)}' WHERE id = ${id}`
		);
		await query(fetch, `DELETE FROM attempt_answers WHERE attempt_id = ${id}`);
	}

	await query(
		fetch,
		`UPDATE test_attempts SET score = ${cleanScore}, completed_at = CURRENT_TIMESTAMP WHERE id = ${id}`
	);

	if (Array.isArray(answers) && answers.length > 0) {
		const values = answers
			.map((a) => {
				const qId = validateNumeric(a.questionId);
				const cId = validateNumeric(a.choiceId);
				const isCorr = validateBoolean(!!a.isCorrect);
				return `(${id}, ${qId}, ${cId}, ${isCorr ? 'TRUE' : 'FALSE'})`;
			})
			.join(', ');
		await query(
			fetch,
			`INSERT INTO attempt_answers (attempt_id, question_id, choice_id, is_correct) VALUES ${values}`
		);
	}

	return id;
}
