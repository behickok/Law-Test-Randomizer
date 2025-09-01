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

export async function uploadTestData(
	fetch,
	{ data, title, teacherId, testId, appendMode = false }
) {
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

	// Add append_mode flag
	if (appendMode) {
		form.append('append_mode', 'true');
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
	const sql = `SELECT ta.id, ta.student_name, ta.score, ta.completed_at, ta.started_at, t.title
                 FROM test_attempts ta
                 JOIN tests t ON t.id = ta.test_id
                 WHERE t.teacher_id = ${cleanTeacherId}
                 ORDER BY ta.started_at DESC, ta.student_name`;
	return query(fetch, sql);
}

export async function getAttemptAnswers(fetch, attemptId) {
	const cleanAttemptId = validateNumeric(attemptId);
	const sql = `SELECT aa.id, q.question_text, q.points, 
                        c.choice_text as student_answer, 
                        aa.answer_text, 
                        aa.is_correct, 
                        aa.points_awarded,
                        correct_c.choice_text as correct_answer
                FROM attempt_answers aa
                JOIN questions q ON q.id = aa.question_id
                LEFT JOIN choices c ON c.id = aa.choice_id
                LEFT JOIN choices correct_c ON correct_c.question_id = q.id AND correct_c.is_correct = TRUE
                WHERE aa.attempt_id = ${cleanAttemptId}
                ORDER BY aa.id`;
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

	try {
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
			if (!id) {
				throw new Error('Failed to create test attempt');
			}
		} else {
			await query(
				fetch,
				`UPDATE test_attempts SET student_name = '${escapeSql(cleanStudentName)}' WHERE id = ${id}`
			);
			await query(fetch, `DELETE FROM attempt_answers WHERE attempt_id = ${id}`);
		}

		let autoScore = 0;
		let hasUngraded = false;

		// Insert answers if provided
		if (Array.isArray(answers) && answers.length > 0) {
			const validAnswers = answers.filter((a) => {
				// Skip answers with invalid question IDs
				if (a.questionId == null || a.questionId === undefined || a.questionId === '') {
					console.warn('Skipping answer with invalid question ID:', a);
					return false;
				}
				return true;
			});

			if (validAnswers.length > 0) {
				const values = validAnswers
					.map((a) => {
						try {
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
						} catch (error) {
							console.error('Error processing answer:', a, error);
							return null;
						}
					})
					.filter((v) => v !== null)
					.join(', ');

				if (values) {
					await query(
						fetch,
						`INSERT INTO attempt_answers (attempt_id, question_id, choice_id, is_correct, answer_text, points_awarded) VALUES ${values}`
					);
				}
			}
		}

		// Update test attempt with score and completion timestamp
		const scoreValue = hasUngraded ? 'NULL' : autoScore;
		const updateResult = await query(
			fetch,
			`UPDATE test_attempts SET score = ${scoreValue}, completed_at = CURRENT_TIMESTAMP WHERE id = ${id}`
		);

		// Verify the update was successful
		if (!updateResult && updateResult !== 0) {
			console.error('Failed to update test attempt completion status');
			// Still return the id so the student sees their submission, but log the error
		}

		return id;
	} catch (error) {
		console.error('Error in submitAttempt:', error);
		throw new Error(`Failed to submit test attempt: ${error.message}`);
	}
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

export async function getAllTeachers(fetch) {
	const sql = `SELECT id, name FROM teachers ORDER BY name`;
	return query(fetch, sql);
}

export async function getAllTestsWithTeachers(fetch) {
	const sql = `SELECT t.id, t.title, t.description, t.is_active, t.teacher_id, te.name as teacher_name
	             FROM tests t
	             JOIN teachers te ON t.teacher_id = te.id
	             ORDER BY te.name, t.title`;
	return query(fetch, sql);
}

export async function getAllStudents(fetch) {
	const sql = `SELECT id, name, pin FROM students ORDER BY name`;
	return query(fetch, sql);
}

export async function getStudentClassAssignments(fetch, studentId) {
	const cleanStudentId = validateNumeric(studentId);
	const sql = `SELECT c.teacher_id, t.name as teacher_name, c.status 
	             FROM classes c 
	             JOIN teachers t ON c.teacher_id = t.id 
	             WHERE c.student_id = ${cleanStudentId}`;
	return query(fetch, sql);
}

export async function assignStudentToClass(fetch, { studentId, teacherId }) {
	const cleanStudentId = validateNumeric(studentId);
	const cleanTeacherId = validateNumeric(teacherId);

	const sql = `INSERT INTO classes (teacher_id, student_id, status) 
	             VALUES (${cleanTeacherId}, ${cleanStudentId}, 'active') 
	             ON CONFLICT (teacher_id, student_id) 
	             DO UPDATE SET status = 'active'`;
	return query(fetch, sql);
}

export async function removeStudentFromClass(fetch, { studentId, teacherId }) {
	const cleanStudentId = validateNumeric(studentId);
	const cleanTeacherId = validateNumeric(teacherId);

	const sql = `UPDATE classes SET status = 'inactive' 
	             WHERE teacher_id = ${cleanTeacherId} AND student_id = ${cleanStudentId}`;
	return query(fetch, sql);
}

export async function getClassAssignmentOverview(fetch) {
	const sql = `SELECT s.id as student_id, s.name as student_name, s.pin as student_pin,
	                    t.id as teacher_id, t.name as teacher_name, c.status
	             FROM students s
	             LEFT JOIN classes c ON s.id = c.student_id AND c.status = 'active'
	             LEFT JOIN teachers t ON c.teacher_id = t.id
	             ORDER BY s.name, t.name`;
	return query(fetch, sql);
}

// Image management functions
export async function uploadImage(fetch, { name, description, mimeType, base64Data, teacherId }) {
	const cleanName = validateString(name);
	const cleanDescription = validateString(description || '');
	const cleanMimeType = validateString(mimeType);
	const cleanBase64Data = validateString(base64Data);
	const cleanTeacherId = validateNumeric(teacherId);

	// Calculate approximate file size from base64 data
	const fileSize = Math.round((cleanBase64Data.length * 3) / 4);

	const sql = `INSERT INTO images (name, description, mime_type, base64_data, uploaded_by, file_size) 
	             VALUES ('${escapeSql(cleanName)}', '${escapeSql(cleanDescription)}', '${escapeSql(cleanMimeType)}', '${escapeSql(cleanBase64Data)}', ${cleanTeacherId}, ${fileSize}) 
	             ON CONFLICT (name, uploaded_by) 
	             DO UPDATE SET description = EXCLUDED.description, mime_type = EXCLUDED.mime_type, base64_data = EXCLUDED.base64_data, file_size = EXCLUDED.file_size
	             RETURNING id, name`;
	return query(fetch, sql);
}

export async function getTeacherImages(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const sql = `SELECT id, name, description, mime_type, base64_data, file_size, created_at
	             FROM images 
	             WHERE uploaded_by = ${cleanTeacherId}
	             ORDER BY created_at DESC`;
	return query(fetch, sql);
}

export async function getImageById(fetch, imageId) {
	const cleanImageId = validateNumeric(imageId);
	const sql = `SELECT id, name, description, mime_type, base64_data, file_size, created_at
	             FROM images 
	             WHERE id = ${cleanImageId}`;
	const result = await query(fetch, sql);
	return result[0];
}

export async function updateImage(fetch, { imageId, name, description, teacherId }) {
	const cleanImageId = validateNumeric(imageId);
	const cleanName = validateString(name);
	const cleanDescription = validateString(description || '');
	const cleanTeacherId = validateNumeric(teacherId);

	const sql = `UPDATE images 
	             SET name = '${escapeSql(cleanName)}', description = '${escapeSql(cleanDescription)}'
	             WHERE id = ${cleanImageId} AND uploaded_by = ${cleanTeacherId}
	             RETURNING id, name, description`;
	return query(fetch, sql);
}

export async function deleteImage(fetch, { imageId, teacherId }) {
	const cleanImageId = validateNumeric(imageId);
	const cleanTeacherId = validateNumeric(teacherId);

	// Check if image is being used in any questions first
	const usageCheck = await query(
		fetch,
		`SELECT id, question_text FROM questions WHERE image_references LIKE '%"${cleanImageId}"%'`
	);

	if (usageCheck.length > 0) {
		throw new Error(`Cannot delete image: it is being used in ${usageCheck.length} question(s)`);
	}

	const sql = `DELETE FROM images WHERE id = ${cleanImageId} AND uploaded_by = ${cleanTeacherId}`;
	return query(fetch, sql);
}

// Template processing functions
export function parseQuestionTemplate(questionText, imageMap = {}) {
	// Replace template variables like {{image_name}} with actual image references
	console.log('🔄 Processing question template:', questionText);
	console.log('🗂️ Available images in imageMap:', Object.keys(imageMap));
	
	return questionText.replace(/\{\{([^}]+)\}\}/g, (match, imageName) => {
		const cleanImageName = imageName.trim();
		console.log(`🔍 Found template: "${match}" -> cleaned name: "${cleanImageName}"`);
		
		if (imageMap[cleanImageName]) {
			console.log(`✅ Image found for "${cleanImageName}":`, {
				id: imageMap[cleanImageName].id,
				name: imageMap[cleanImageName].name,
				hasBase64: !!imageMap[cleanImageName].base64_data,
				base64Length: imageMap[cleanImageName].base64_data?.length
			});
			return `<img src="${imageMap[cleanImageName].base64_data}" alt="${imageMap[cleanImageName].description || cleanImageName}" class="question-image" data-image-id="${imageMap[cleanImageName].id}" />`;
		} else {
			console.warn(`❌ Image NOT found for "${cleanImageName}". Available images:`, Object.keys(imageMap));
			return match; // Keep original template if image not found
		}
	});
}

export async function processQuestionWithImages(fetch, { questionText, teacherId }) {
	console.log('🚀 Starting processQuestionWithImages for teacher:', teacherId);
	console.log('📝 Question text:', questionText);
	
	const cleanTeacherId = validateNumeric(teacherId);

	// Validate question text
	if (!questionText || typeof questionText !== 'string') {
		console.log('⚠️ Invalid question text provided');
		return {
			processedText: questionText || '',
			imageReferences: []
		};
	}

	// Extract template variables from question text
	const templateMatches = [...questionText.matchAll(/\{\{([^}]+)\}\}/g)];
	console.log('🔍 Found template matches:', templateMatches.map(m => m[0]));

	if (templateMatches.length === 0) {
		console.log('ℹ️ No image templates found in question text');
		return {
			processedText: questionText,
			imageReferences: []
		};
	}

	try {
		// Get all images for this teacher
		console.log('📥 Fetching teacher images...');
		const teacherImages = await getTeacherImages(fetch, cleanTeacherId);
		console.log('🖼️ Teacher images loaded:', teacherImages?.length || 0);
		console.log('📋 Teacher image names:', (teacherImages || []).map(img => img.name));
		
		const imageMap = {};

		// Create lookup map by image name
		for (const image of teacherImages || []) {
			imageMap[image.name] = image;
			console.log(`🏷️ Mapped image: "${image.name}" -> ID: ${image.id}`);
		}

		// The imageMap is already populated with full image data from getTeacherImages.
		// The redundant and buggy re-fetch loop is removed.
		const processedText = parseQuestionTemplate(questionText, imageMap);
		console.log('✅ Template processing complete');

		// Re-calculate referenced images and their IDs based on the final map
		const referencedImages = [];
		const usedImageIds = [];
		const uniqueImageIds = new Set();

		for (const match of templateMatches) {
			const imageName = match[1].trim();
			const image = imageMap[imageName];
			if (image && !uniqueImageIds.has(image.id)) {
				referencedImages.push(image);
				usedImageIds.push(image.id);
				uniqueImageIds.add(image.id);
			}
		}

		return {
			processedText,
			imageReferences: usedImageIds,
			referencedImages
		};
	} catch (error) {
		console.error('💥 Error in processQuestionWithImages:', error);
		return {
			processedText: questionText,
			imageReferences: [],
			error: error.message
		};
	}
}

export async function getActiveTests(fetch) {
	const sql = `SELECT id, title, description, is_active FROM tests WHERE is_active = TRUE`;
	return query(fetch, sql);
}

export async function copyTestToTeacher(fetch, { testId, fromTeacherId, toTeacherId, newTitle }) {
	const cleanTestId = validateNumeric(testId);
	const cleanFromTeacherId = validateNumeric(fromTeacherId);
	const cleanToTeacherId = validateNumeric(toTeacherId);
	const cleanNewTitle = validateString(newTitle);

	try {
		// Verify source test ownership
		const ownershipCheck = await query(
			fetch,
			`SELECT id, title, description FROM tests WHERE id = ${cleanTestId} AND teacher_id = ${cleanFromTeacherId}`
		);

		if (ownershipCheck.length === 0) {
			throw new Error('Source test not found or access denied');
		}

		const sourceTest = ownershipCheck[0];

		// Create new test for destination teacher
		const newTestRes = await query(
			fetch,
			`INSERT INTO tests (title, description, teacher_id, is_active) 
			 VALUES ('${escapeSql(cleanNewTitle)}', '${escapeSql(sourceTest.description || '')}', ${cleanToTeacherId}, FALSE) 
			 RETURNING id`
		);
		const newTestId = Array.isArray(newTestRes) ? newTestRes[0]?.id : newTestRes?.data?.[0]?.id;

		if (!newTestId) {
			throw new Error('Failed to create new test');
		}

		// Copy sections
		const sectionsRes = await query(
			fetch,
			`SELECT section_name, section_order, total_questions FROM sections WHERE test_id = ${cleanTestId} ORDER BY section_order`
		);
		const sections = Array.isArray(sectionsRes) ? sectionsRes : (sectionsRes?.data ?? []);

		const sectionMapping = new Map();
		for (const section of sections) {
			const newSectionRes = await query(
				fetch,
				`INSERT INTO sections (test_id, section_name, section_order, total_questions) 
				 VALUES (${newTestId}, '${escapeSql(section.section_name)}', ${section.section_order}, ${section.total_questions}) 
				 RETURNING id`
			);
			const newSectionId = Array.isArray(newSectionRes)
				? newSectionRes[0]?.id
				: newSectionRes?.data?.[0]?.id;
			sectionMapping.set(section.section_name, newSectionId);
		}

		// Copy questions
		const questionsRes = await query(
			fetch,
			`SELECT q.id, q.question_text, q.points, q.section_id, s.section_name
			 FROM questions q
			 LEFT JOIN sections s ON q.section_id = s.id
			 WHERE q.test_id = ${cleanTestId}
			 ORDER BY q.id`
		);
		const questions = Array.isArray(questionsRes) ? questionsRes : (questionsRes?.data ?? []);

		const questionMapping = new Map();
		for (const question of questions) {
			const newSectionId = question.section_name ? sectionMapping.get(question.section_name) : null;
			const newQuestionRes = await query(
				fetch,
				`INSERT INTO questions (test_id, question_text, points, section_id) 
				 VALUES (${newTestId}, '${escapeSql(question.question_text)}', ${question.points || 1}, ${newSectionId || 'NULL'}) 
				 RETURNING id`
			);
			const newQuestionId = Array.isArray(newQuestionRes)
				? newQuestionRes[0]?.id
				: newQuestionRes?.data?.[0]?.id;
			questionMapping.set(question.id, newQuestionId);
		}

		// Copy choices
		const choicesRes = await query(
			fetch,
			`SELECT choice_text, is_correct, question_id FROM choices WHERE question_id IN (${questions.map((q) => q.id).join(', ')}) ORDER BY question_id, id`
		);
		const choices = Array.isArray(choicesRes) ? choicesRes : (choicesRes?.data ?? []);

		for (const choice of choices) {
			const newQuestionId = questionMapping.get(choice.question_id);
			if (newQuestionId) {
				await query(
					fetch,
					`INSERT INTO choices (question_id, choice_text, is_correct) 
					 VALUES (${newQuestionId}, '${escapeSql(choice.choice_text)}', ${choice.is_correct ? 'TRUE' : 'FALSE'})`
				);
			}
		}

		return {
			success: true,
			newTestId,
			message: `Test "${sourceTest.title}" successfully copied as "${cleanNewTitle}"`
		};
	} catch (error) {
		console.error('Error copying test:', error);
		throw new Error(`Failed to copy test: ${error.message}`);
	}
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
