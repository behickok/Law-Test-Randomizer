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

export async function uploadTestData(fetch, { data, title, teacherId, testId }) {
	if (!data || !data.trim()) {
		throw new Error('Test data is required');
	}

	const cleanTitle = validateString(title);
	const cleanTeacherId = validateNumeric(teacherId);

	const form = new FormData();
	form.append('data', data.trim());
	form.append('title', cleanTitle);
	form.append('teacher_id', cleanTeacherId);

	// Add test_id if updating existing test
	if (testId) {
		form.append('test_id', validateNumeric(testId));
	}

	const res = await fetch(`/api/tests/upload`, {
		method: 'POST',
		body: form
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(errorText);
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
	const sql = `SELECT ta.id, ta.student_name, ta.score, ta.completed_at, t.title
                 FROM test_attempts ta
                 JOIN tests t ON t.id = ta.test_id
                 WHERE t.teacher_id = ${cleanTeacherId}
                 ORDER BY ta.completed_at DESC, ta.student_name`;
	return query(fetch, sql);
}

export async function getAttemptAnswers(fetch, attemptId) {
	const cleanAttemptId = validateNumeric(attemptId);
	const sql = `SELECT aa.id, q.question_text, q.points, c.choice_text, aa.answer_text, aa.is_correct, aa.points_awarded
                FROM attempt_answers aa
                JOIN questions q ON q.id = aa.question_id
                LEFT JOIN choices c ON c.id = aa.choice_id
                WHERE aa.attempt_id = ${cleanAttemptId}`;
	return query(fetch, sql);
}

export async function gradeAttemptAnswer(fetch, { answerId, isCorrect, pointsAwarded }) {
	const cleanAnswerId = validateNumeric(answerId);
	const isCorr =
		isCorrect === null || isCorrect === undefined
			? 'NULL'
			: validateBoolean(isCorrect)
				? 'TRUE'
				: 'FALSE';
	const points =
		pointsAwarded === null || pointsAwarded === undefined ? 'NULL' : validateNumeric(pointsAwarded);

	const sql = `UPDATE attempt_answers SET is_correct = ${isCorr}, points_awarded = ${points} WHERE id = ${cleanAnswerId};
                UPDATE test_attempts SET score = (SELECT COALESCE(SUM(points_awarded),0) FROM attempt_answers WHERE attempt_id = test_attempts.id) WHERE id = (SELECT attempt_id FROM attempt_answers WHERE id = ${cleanAnswerId});`;
	return query(fetch, sql);
}

export async function getStudentResults(fetch, studentId) {
	const cleanStudentId = validateNumeric(studentId);
	const sql = `
        SELECT t.id AS test_id, t.title, ta.score, ta.completed_at
        FROM test_attempts ta
        JOIN tests t ON t.id = ta.test_id
        WHERE ta.student_id = ${cleanStudentId}
        AND (t.is_active = TRUE OR ta.completed_at IS NOT NULL)
    `;
	return query(fetch, sql);
}

export async function addTeacher(fetch, { name, pin }) {
	const cleanName = validateString(name);
	const cleanPin = validateNumeric(pin);
	const inviteCode = crypto.randomUUID();
	const sql = `INSERT INTO teachers (name, pin, invite_code) VALUES ('${escapeSql(
		cleanName
	)}', '${escapeSql(cleanPin)}', '${inviteCode}')`;
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

export async function joinClassWithInviteCode(fetch, { studentId, inviteCode }) {
	const cleanStudentId = validateNumeric(studentId);
	const cleanInviteCode = validateString(inviteCode);
	const sql = `INSERT INTO classes (teacher_id, student_id, status) SELECT id, ${cleanStudentId}, 'active' FROM teachers WHERE invite_code = '${escapeSql(cleanInviteCode)}' ON CONFLICT (teacher_id, student_id) DO NOTHING`;
	return query(fetch, sql);
}

export async function updateQuestion(fetch, { questionId, text, teacherId, points }) {
	const cleanQuestionId = validateNumeric(questionId);
	const cleanText = validateString(text);
	const cleanTeacherId = validateNumeric(teacherId);
	const cleanPoints = validateNumeric(points);
	const sql = `UPDATE questions SET question_text = '${escapeSql(
		cleanText
	)}', points = ${cleanPoints} WHERE id = ${cleanQuestionId} AND EXISTS (SELECT 1 FROM tests t WHERE t.id = questions.test_id AND t.teacher_id = ${cleanTeacherId})`;
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

export async function submitAttempt(fetch, { testId, studentId, studentName, answers }) {
	const cleanTestId = validateNumeric(testId);
	const cleanStudentId = validateNumeric(studentId);
	const cleanStudentName = validateString(studentName);

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

	let autoScore = 0;
	let hasUngraded = false;

	let values = '';
	if (Array.isArray(answers) && answers.length > 0) {
		values = answers
			.map((a) => {
				const qId = validateNumeric(a.questionId);
				if (a.answerText !== undefined) {
					hasUngraded = true;
					const txt = escapeSql(validateString(a.answerText));
					return `(${id}, ${qId}, NULL, NULL, '${txt}', NULL)`;
				}
				const cId = validateNumeric(a.choiceId);
				const isCorr = validateBoolean(!!a.isCorrect);
				const pts = validateNumeric(a.points ?? 0);
				if (isCorr) autoScore += pts;
				return `(${id}, ${qId}, ${cId}, ${isCorr ? 'TRUE' : 'FALSE'}, NULL, ${isCorr ? pts : 0})`;
			})
			.join(', ');
		await query(
			fetch,
			`INSERT INTO attempt_answers (attempt_id, question_id, choice_id, is_correct, answer_text, points_awarded) VALUES ${values}`
		);
	}

	const scoreValue = hasUngraded ? 'NULL' : autoScore;
	await query(
		fetch,
		`UPDATE test_attempts SET score = ${scoreValue}, completed_at = CURRENT_TIMESTAMP WHERE id = ${id}`
	);

	return id;
}

// Public signup functions (no authentication required)
export async function signupTeacher(fetch, { name, pin }) {
	const cleanName = validateString(name);
	const cleanPin = validateNumeric(pin);

	// Check if PIN is already taken
	const existingUsers = await query(
		fetch,
		`SELECT 1 FROM teachers WHERE pin = '${escapeSql(cleanPin)}' 
		 UNION SELECT 1 FROM students WHERE pin = '${escapeSql(cleanPin)}' LIMIT 1`
	);

	if (existingUsers.length > 0) {
		throw new Error('PIN already exists. Please choose a different PIN.');
	}

	const inviteCode = crypto.randomUUID();
	const sql = `INSERT INTO teachers (name, pin, invite_code) VALUES ('${escapeSql(
		cleanName
	)}', '${escapeSql(cleanPin)}', '${inviteCode}') RETURNING id, name, 'teacher' as role`;
	return query(fetch, sql);
}

export async function signupStudent(fetch, { name, pin }) {
	const cleanName = validateString(name);
	const cleanPin = validateNumeric(pin);

	// Check if PIN is already taken
	const existingUsers = await query(
		fetch,
		`SELECT 1 FROM teachers WHERE pin = '${escapeSql(cleanPin)}' 
		 UNION SELECT 1 FROM students WHERE pin = '${escapeSql(cleanPin)}' LIMIT 1`
	);

	if (existingUsers.length > 0) {
		throw new Error('PIN already exists. Please choose a different PIN.');
	}

	const sql = `INSERT INTO students (name, pin) VALUES ('${escapeSql(cleanName)}', '${escapeSql(cleanPin)}') RETURNING id, name, 'student' as role`;
	return query(fetch, sql);
}

export async function deleteTest(fetch, { testId, teacherId }) {
	const cleanTestId = validateNumeric(testId);
	const cleanTeacherId = validateNumeric(teacherId);

	// Verify ownership first
	const ownershipCheck = await query(
		fetch,
		`SELECT id FROM tests WHERE id = ${cleanTestId} AND teacher_id = ${cleanTeacherId}`
	);

	if (ownershipCheck.length === 0) {
		throw new Error('Test not found or access denied');
	}

	// Delete in correct order: attempt_answers, choices, questions, sections, test_attempts, then test
	await query(
		fetch,
		`DELETE FROM attempt_answers WHERE question_id IN (SELECT id FROM questions WHERE test_id = ${cleanTestId})`
	);
	await query(
		fetch,
		`DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE test_id = ${cleanTestId})`
	);
	await query(fetch, `DELETE FROM questions WHERE test_id = ${cleanTestId}`);
	await query(fetch, `DELETE FROM sections WHERE test_id = ${cleanTestId}`);
	await query(fetch, `DELETE FROM test_attempts WHERE test_id = ${cleanTestId}`);
	await query(fetch, `DELETE FROM tests WHERE id = ${cleanTestId}`);

	return { success: true };
}

export async function getTestsForTeacher(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const sql = `SELECT id, title, description, is_active FROM tests WHERE teacher_id = ${cleanTeacherId}`;
	return query(fetch, sql);
}

export async function getTeacher(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const sql = `SELECT id, name, pin, invite_code FROM teachers WHERE id = ${cleanTeacherId}`;
	const result = await query(fetch, sql);
	return result[0];
}

export async function getActiveTests(fetch) {
	const sql = `SELECT id, title, description, is_active FROM tests WHERE is_active = TRUE`;
	return query(fetch, sql);
}

export async function getTestQuestions(fetch, { testId, teacherId }) {
	const cleanTestId = validateNumeric(testId);
	const cleanTeacherId = validateNumeric(teacherId);

	// Verify ownership first
	const ownershipCheck = await query(
		fetch,
		`SELECT id FROM tests WHERE id = ${cleanTestId} AND teacher_id = ${cleanTeacherId}`
	);

	if (ownershipCheck.length === 0) {
		throw new Error('Test not found or access denied');
	}

	// Get questions with their choices and section information
	const sql = `SELECT q.id as db_id, q.question_id, q.question_text, q.points, q.section_id,
                        s.section_name, s.section_order, s.total_questions,
                        c.choice_text, c.is_correct
                FROM questions q
                LEFT JOIN sections s ON q.section_id = s.id
                LEFT JOIN choices c ON q.id = c.question_id
                WHERE q.test_id = ${cleanTestId}
                ORDER BY s.section_order, q.id, c.id`;

	const rows = await query(fetch, sql);
	const questionsMap = new Map();

	for (const row of rows) {
		// Use question_id if available, otherwise generate one based on db_id
		const qId = row.question_id || `Q${row.db_id}`;
		if (!questionsMap.has(qId)) {
			questionsMap.set(qId, {
				questionId: qId,
				questionText: row.question_text,
				points: row.points,
				sectionName: row.section_name || 'Default Section',
				sectionOrder: row.section_order || 1,
				sectionTotalQuestions: row.total_questions || 999,
				choices: []
			});
		}
		if (row.choice_text) {
			questionsMap.get(qId).choices.push({
				text: row.choice_text,
				isCorrect: row.is_correct
			});
		}
	}

	return Array.from(questionsMap.values());
}
