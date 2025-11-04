const BASE_URL = '/api';

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

export async function uploadTestData(
        fetch,
        { data, title, testId, appendMode = false }
) {
        if (!data || !data.trim()) {
                throw new Error('Test data is required');
        }

        const cleanTitle = validateString(title);

        const form = new FormData();
        form.append('data', data.trim());
        form.append('title', cleanTitle);

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

        const res = await fetch(`${BASE_URL}/tests/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                        testId: cleanTestId,
                        studentId: cleanStudentId,
                        studentName: cleanStudentName
                })
        });

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json();
}

export async function setTestActive(fetch, { testId, teacherId, isActive }) {
	const cleanTestId = validateNumeric(testId);
	const cleanTeacherId = validateNumeric(teacherId);
	const cleanIsActive = validateBoolean(isActive);

	const res = await fetch(`${BASE_URL}/tests/active`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			testId: cleanTestId,
			teacherId: cleanTeacherId,
			isActive: cleanIsActive
		})
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json();
}

export async function getTeacherResults(fetch) {
        const res = await fetch(`${BASE_URL}/results/teacher`, { method: 'POST' });

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json();
}

export async function getAttemptAnswers(fetch, { attemptId }) {
        const cleanAttemptId = validateNumeric(attemptId);

        const res = await fetch(`${BASE_URL}/attempts/${cleanAttemptId}/answers`, {
                method: 'POST'
        });

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json();
}

export async function gradeAttemptAnswer(fetch, { answerId, isCorrect, pointsAwarded }) {
        const cleanAnswerId = validateNumeric(answerId);

        let normalisedCorrect = null;
        if (isCorrect !== null && isCorrect !== undefined) {
                normalisedCorrect = validateBoolean(isCorrect);
	}

	const normalisedPoints =
		pointsAwarded === null || pointsAwarded === undefined ? null : validateNumeric(pointsAwarded);

        const res = await fetch(`${BASE_URL}/attempts/answers/grade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                        answerId: cleanAnswerId,
                        isCorrect: normalisedCorrect,
                        pointsAwarded: normalisedPoints
                })
        });

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json();
}

export async function getStudentResults(fetch, studentId) {
	const cleanStudentId = validateNumeric(studentId);
	const res = await fetch(`${BASE_URL}/results/student`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ studentId: cleanStudentId })
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json();
}

export async function addTeacher(fetch, { name, pin }) {
	const cleanName = validateString(name);
	const cleanPin = validateNumeric(pin);
	const res = await fetch(`${BASE_URL}/admin/teachers`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name: cleanName, pin: String(cleanPin) })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function addStudent(fetch, { name, pin, teacherId }) {
	const cleanName = validateString(name);
	const cleanPin = validateNumeric(pin);
	const payload = {
		name: cleanName,
		pin: String(cleanPin),
		...(teacherId !== undefined ? { teacherId: String(validateNumeric(teacherId)) } : {})
	};
	const res = await fetch(`${BASE_URL}/admin/students`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function getClassStudents(fetch) {
        const res = await fetch(`${BASE_URL}/classes/students`);
        if (!res.ok) {
                throw new Error(await res.text());
        }
        const data = await res.json();
        return Array.isArray(data) ? data : data?.students ?? [];
}

export async function joinClassWithInviteCode(fetch, { studentId, inviteCode }) {
	const cleanStudentId = validateNumeric(studentId);
	const cleanInviteCode = validateString(inviteCode);
	const res = await fetch(`${BASE_URL}/classes/join`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ studentId: cleanStudentId, inviteCode: cleanInviteCode })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function updateQuestion(fetch, { questionId, text, teacherId, points }) {
	const cleanQuestionId = validateNumeric(questionId);
	const cleanText = validateString(text);
	const cleanTeacherId = validateNumeric(teacherId);
	const cleanPoints = validateNumeric(points);
	const res = await fetch(`${BASE_URL}/questions/${cleanQuestionId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			teacherId: cleanTeacherId,
			text: cleanText,
			points: cleanPoints
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function updateChoice(fetch, { choiceId, text, isCorrect, teacherId }) {
	const cleanChoiceId = validateNumeric(choiceId);
	const cleanText = validateString(text);
	const cleanIsCorrect = validateBoolean(isCorrect);
	const cleanTeacherId = validateNumeric(teacherId);
	const res = await fetch(`${BASE_URL}/choices/${cleanChoiceId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			text: cleanText,
			isCorrect: cleanIsCorrect,
			teacherId: cleanTeacherId
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

function shuffle(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

async function processQuestionsWithImagesOptimized(fetch, questions) {
	// simplified version: just set processed_question_text
	for (const q of questions) {
		q.processed_question_text = q.text || q.question_text;
	}
	return;
}

export async function startAttempt(fetch, { testId, studentId, studentName }) {
	const cleanTestId = validateNumeric(testId);
	const cleanStudentId = validateNumeric(studentId);
	const cleanStudentName = validateString(studentName).trim();

	const res = await fetch(`${BASE_URL}/attempts/start`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			testId: cleanTestId,
			studentId: cleanStudentId,
			studentName: cleanStudentName
		})
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}

	const payload = await res.json();
	if (Array.isArray(payload?.questions)) {
		await processQuestionsWithImagesOptimized(fetch, payload.questions);
	}
	return payload;
}

export async function saveAttemptAnswer(fetch, { attemptId, questionId, choiceId, answerText }) {
	const cleanAttemptId = validateNumeric(attemptId);
	const cleanQuestionId = validateNumeric(questionId);
	const payload = {
		questionId: cleanQuestionId,
		choiceId: choiceId == null ? null : validateNumeric(choiceId),
		answerText: answerText == null ? null : validateString(answerText).trim()
	};

	const res = await fetch(`${BASE_URL}/attempts/${cleanAttemptId}/answer`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function submitAttempt(fetch, { attemptId }) {
	const cleanAttemptId = validateNumeric(attemptId);

	const res = await fetch(`${BASE_URL}/attempts/${cleanAttemptId}/submit`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' }
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

// Public signup functions (no authentication required)
export async function signupTeacher(fetch, { name, pin }) {
	const cleanName = validateString(name).trim();
	const cleanPin = String(pin).trim();
	if (!/^\d+$/.test(cleanPin)) {
		throw new Error('PIN must be numeric');
	}

	const res = await fetch(`${BASE_URL}/auth/signup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ role: 'teacher', name: cleanName, pin: cleanPin })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function signupStudent(fetch, { name, pin }) {
	const cleanName = validateString(name).trim();
	const cleanPin = String(pin).trim();
	if (!/^\d+$/.test(cleanPin)) {
		throw new Error('PIN must be numeric');
	}

	const res = await fetch(`${BASE_URL}/auth/signup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ role: 'student', name: cleanName, pin: cleanPin })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function signupReviewer(fetch, { name, email, pin }) {
	const cleanName = validateString(name).trim();
	const cleanEmail = validateString(email).trim();
	const cleanPin = String(pin).trim();
	if (!/^\d+$/.test(cleanPin)) {
		throw new Error('PIN must be numeric');
	}

	const res = await fetch(`${BASE_URL}/auth/signup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			role: 'reviewer',
			name: cleanName,
			email: cleanEmail,
			pin: cleanPin
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function signupReviewerWithInvite(fetch, { name, pin, inviteCode }) {
	const cleanName = validateString(name).trim();
	const cleanPin = String(pin).trim();
	const cleanInviteCode = validateString(inviteCode).trim();
	if (!/^\d+$/.test(cleanPin)) {
		throw new Error('PIN must be numeric');
	}

	const res = await fetch(`${BASE_URL}/auth/signup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			role: 'reviewer',
			name: cleanName,
			pin: cleanPin,
			inviteCode: cleanInviteCode
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function deleteTest(fetch, { testId }) {
        const cleanTestId = validateNumeric(testId);

        const res = await fetch(`${BASE_URL}/tests/${cleanTestId}`, {
                method: 'DELETE'
        });

        if (!res.ok) {
                throw new Error(await res.text());
        }

        return res.json();
}

export async function getTestsForTeacher(fetch) {
        const res = await fetch(`${BASE_URL}/tests/teacher`);
        if (!res.ok) {
                throw new Error(await res.text());
        }
        const data = await res.json();
        return Array.isArray(data) ? data : data?.tests ?? [];
}

export async function getTeacher(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const res = await fetch(`${BASE_URL}/admin/teachers/${cleanTeacherId}`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return data.teacher;
}

export async function getAllTeachers(fetch) {
	const res = await fetch(`${BASE_URL}/admin/teachers`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.teachers ?? [];
}

export async function getAllTestsWithTeachers(fetch) {
	const res = await fetch(`${BASE_URL}/admin/tests`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.tests ?? [];
}

export async function getAllStudents(fetch) {
	const res = await fetch(`${BASE_URL}/admin/students`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	const students = Array.isArray(data) ? data : data?.students ?? [];
	return students.map((student) => {
		const hasPin = Boolean(student.hasPin ?? student.has_pin);
		const pinIsHashed = Boolean(student.pinIsHashed ?? student.pin_is_hashed);
		return {
			id: student.id,
			name: student.name,
			hasPin,
			pinIsHashed,
			legacyPin: hasPin && !pinIsHashed
		};
	});
}

export async function getAllReviewers(fetch) {
	const res = await fetch(`${BASE_URL}/reviewers`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.reviewers ?? [];
}

export async function getAllReviewersForAdmin(fetch) {
	const res = await fetch(`${BASE_URL}/admin/reviewers`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	const reviewers = Array.isArray(data) ? data : data?.reviewers ?? [];
	return reviewers.map((reviewer) => {
		const hasPin = Boolean(reviewer.hasPin ?? reviewer.has_pin);
		const pinIsHashed = Boolean(reviewer.pinIsHashed ?? reviewer.pin_is_hashed);
		return {
			id: reviewer.id,
			name: reviewer.name,
			email: reviewer.email,
			is_active: reviewer.is_active,
			created_at: reviewer.created_at,
			hasPin,
			pinIsHashed,
			legacyPin: hasPin && !pinIsHashed
		};
	});
}

export async function addReviewer(fetch, { name, email, pin }) {
	const cleanName = validateString(name);
	const cleanEmail = validateString(email);
	const cleanPin = validateNumeric(pin);

	const res = await fetch(`${BASE_URL}/admin/reviewers`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name: cleanName,
			email: cleanEmail,
			pin: String(cleanPin)
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function updateReviewer(fetch, { id, name, email, pin, isActive }) {
	const cleanId = validateNumeric(id);
	const cleanName = validateString(name);
	const cleanEmail = validateString(email);
	const cleanIsActive = validateBoolean(isActive);
	const payload = {
		name: cleanName,
		email: cleanEmail,
		isActive: cleanIsActive
	};

	if (pin !== undefined && pin !== null && String(pin).trim() !== '') {
		const cleanPin = validateNumeric(pin);
		payload.pin = String(cleanPin);
	}

	const res = await fetch(`${BASE_URL}/admin/reviewers/${cleanId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function deleteReviewer(fetch, id) {
	const cleanId = validateNumeric(id);

	const res = await fetch(`${BASE_URL}/admin/reviewers/${cleanId}`, {
		method: 'DELETE'
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function createReviewerInvitation(fetch, { teacherId, reviewerName, reviewerEmail }) {
	const cleanTeacherId = validateNumeric(teacherId);
	const cleanReviewerName = validateString(reviewerName);
	const cleanReviewerEmail = validateString(reviewerEmail);

	const res = await fetch(`${BASE_URL}/admin/reviewer-invitations`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			teacherId: cleanTeacherId,
			reviewerName: cleanReviewerName,
			reviewerEmail: cleanReviewerEmail
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function getReviewerInvitations(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const res = await fetch(`${BASE_URL}/admin/reviewer-invitations`, {
		headers: { 'x-teacher-id': String(cleanTeacherId) }
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.invitations ?? [];
}

export async function getStudentClassAssignments(fetch, studentId) {
	const cleanStudentId = validateNumeric(studentId);
	const res = await fetch(`${BASE_URL}/classes/student/${cleanStudentId}`);
	if (!res.ok) {
		throw new Error(await res.text());
}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.assignments ?? [];
}

export async function assignStudentToClass(fetch, { studentId, teacherId }) {
	const cleanStudentId = validateNumeric(studentId);
	const cleanTeacherId = validateNumeric(teacherId);

	const res = await fetch(`${BASE_URL}/admin/classes/assign`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ studentId: cleanStudentId, teacherId: cleanTeacherId })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function removeStudentFromClass(fetch, { studentId, teacherId }) {
	const cleanStudentId = validateNumeric(studentId);
	const cleanTeacherId = validateNumeric(teacherId);

	const res = await fetch(`${BASE_URL}/admin/classes/remove`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ studentId: cleanStudentId, teacherId: cleanTeacherId })
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function getClassAssignmentOverview(fetch) {
	const res = await fetch(`${BASE_URL}/admin/classes`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	const assignments = Array.isArray(data) ? data : data?.assignments ?? [];
	return assignments.map((assignment) => {
		const hasPin =
			Boolean(assignment.studentHasPin ?? assignment.student_has_pin) ||
			Boolean(assignment.student_pin);
		const pinIsHashed = Boolean(
			assignment.studentPinIsHashed ?? assignment.student_pin_is_hashed
		);
		return {
			student_id: assignment.student_id,
			student_name: assignment.student_name,
			student_has_pin: hasPin,
			student_pin_is_hashed: pinIsHashed,
			teacher_id: assignment.teacher_id,
			teacher_name: assignment.teacher_name,
			status: assignment.status
		};
	});
}

// Image management functions
export async function uploadImage(fetch, { name, description, mimeType, base64Data, teacherId }) {
	const cleanName = validateString(name);
	const cleanDescription = validateString(description || '');
	const cleanMimeType = validateString(mimeType);
	const cleanBase64Data = validateString(base64Data);
	const cleanTeacherId = validateNumeric(teacherId);

	const res = await fetch(`${BASE_URL}/admin/images`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name: cleanName,
			description: cleanDescription,
			mimeType: cleanMimeType,
			base64Data: cleanBase64Data,
			teacherId: cleanTeacherId
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function getTeacherImages(fetch, teacherId) {
	const cleanTeacherId = validateNumeric(teacherId);
	const res = await fetch(`${BASE_URL}/admin/images`, {
		headers: {
			'x-teacher-id': String(cleanTeacherId)
		}
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.images ?? [];
}

export async function getImageById(fetch, imageId, teacherId) {
	const cleanImageId = validateNumeric(imageId);
	const headers = {};
	if (teacherId !== undefined) {
		headers['x-teacher-id'] = String(validateNumeric(teacherId));
	}
	const res = await fetch(`${BASE_URL}/admin/images/${cleanImageId}`, {
		headers
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return data?.image;
}

export async function updateImage(fetch, { imageId, name, description, teacherId }) {
	const cleanImageId = validateNumeric(imageId);
	const cleanName = validateString(name);
	const cleanDescription = validateString(description || '');
	const cleanTeacherId = validateNumeric(teacherId);

	const res = await fetch(`${BASE_URL}/admin/images/${cleanImageId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name: cleanName,
			description: cleanDescription,
			teacherId: cleanTeacherId
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function deleteImage(fetch, { imageId, teacherId }) {
	const cleanImageId = validateNumeric(imageId);
	const cleanTeacherId = validateNumeric(teacherId);

	const res = await fetch(`${BASE_URL}/admin/images/${cleanImageId}`, {
		method: 'DELETE',
		headers: {
			'x-teacher-id': String(cleanTeacherId)
		}
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
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

			const image = imageMap[cleanImageName];
			const src = image.base64_data.startsWith('data:')
				? image.base64_data
				: `data:${image.mime_type};base64,${image.base64_data}`;

			console.log(`🖼️ Generated image tag for "${cleanImageName}":`, {
				imageId: image.id,
				mimeType: image.mime_type,
				srcLength: src.length,
				srcPreview: src.substring(0, 50) + '...'
			});

			return `<img src="${src}" alt="${image.description || cleanImageName}" class="question-image" data-image-id="${image.id}" />`;
		} else {
			console.warn(
				`❌ Image NOT found for "${cleanImageName}". Available images:`,
				Object.keys(imageMap)
			);
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
	console.log(
		'🔍 Found template matches:',
		templateMatches.map((m) => m[0])
	);

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
		console.log(
			'📋 Teacher image names:',
			(teacherImages || []).map((img) => img.name)
		);

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
	const res = await fetch(`${BASE_URL}/tests/active`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.tests ?? [];
}

export async function copyTestToTeacher(fetch, { testId, fromTeacherId, toTeacherId, newTitle }) {
	const cleanTestId = validateNumeric(testId);
	const cleanFromTeacherId = validateNumeric(fromTeacherId);
	const cleanToTeacherId = validateNumeric(toTeacherId);
	const cleanNewTitle = validateString(newTitle);

	const res = await fetch(`${BASE_URL}/admin/tests/copy`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			testId: cleanTestId,
			fromTeacherId: cleanFromTeacherId,
			toTeacherId: cleanToTeacherId,
			newTitle: cleanNewTitle
		})
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function getTestQuestions(fetch, { testId }) {
        const cleanTestId = validateNumeric(testId);
        const res = await fetch(`${BASE_URL}/tests/${cleanTestId}/questions`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.questions ?? [];
}

// Review System API Functions

export async function createReviewAssignment(
        fetch,
        { testId, reviewers, title, description, questionsPerReviewer = 40, overlapFactor = 2 }
) {
        const cleanTestId = validateNumeric(testId);
        const cleanTitle = validateString(title);
        const cleanDescription = validateString(description || '');
        const cleanQuestionsPerReviewer = validateNumeric(questionsPerReviewer);
        const cleanOverlapFactor = validateNumeric(overlapFactor);

	if (!Array.isArray(reviewers) || reviewers.length === 0) {
		throw new Error('At least one reviewer must be selected');
	}

	const cleanReviewers = reviewers.map((r) => validateNumeric(r));

        const res = await fetch(`${BASE_URL}/review-assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                        testId: cleanTestId,
                        reviewers: cleanReviewers,
                        title: cleanTitle,
                        description: cleanDescription,
                        questionsPerReviewer: cleanQuestionsPerReviewer,
                        overlapFactor: cleanOverlapFactor
		})
	});

	if (!res.ok) {
		throw new Error(await res.text());
	}

	return res.json();
}

export async function getReviewAssignments(fetch) {
        const res = await fetch(`${BASE_URL}/review-assignments`);
        if (!res.ok) {
                throw new Error(await res.text());
        }
        const data = await res.json();
        return Array.isArray(data) ? data : data?.assignments ?? [];
}

export async function getReviewerAssignments(fetch, reviewerId) {
	const cleanReviewerId = validateNumeric(reviewerId);
	const res = await fetch(`${BASE_URL}/reviewer-assignments?reviewerId=${cleanReviewerId}`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.assignments ?? [];
}

export async function getQuestionsForReview(fetch, reviewerId, assignmentId) {
	const cleanReviewerId = validateNumeric(reviewerId);
	const cleanAssignmentId = validateNumeric(assignmentId);
	const res = await fetch(
		`${BASE_URL}/reviewer-assignments/${cleanAssignmentId}/questions?reviewerId=${cleanReviewerId}`
	);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.questions ?? [];
}

export async function submitQuestionReview(
	fetch,
	{ reviewId, rating, feedback, suggestions, difficultyRating, clarityRating, relevanceRating }
) {
	const cleanReviewId = validateNumeric(reviewId);
	const cleanFeedback =
		feedback && feedback.trim().length > 0 ? validateString(feedback).trim() : null;
	const cleanSuggestions =
		suggestions && suggestions.trim().length > 0 ? validateString(suggestions).trim() : null;
	const payload = {
		rating: rating == null ? null : validateNumeric(rating),
		feedback: cleanFeedback,
		suggestions: cleanSuggestions,
		difficultyRating: difficultyRating == null ? null : validateNumeric(difficultyRating),
		clarityRating: clarityRating == null ? null : validateNumeric(clarityRating),
		relevanceRating: relevanceRating == null ? null : validateNumeric(relevanceRating)
	};

	const res = await fetch(`${BASE_URL}/reviewer-reviews/${cleanReviewId}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		throw new Error(await res.text());
	}
	return res.json();
}

export async function getReviewResults(fetch, assignmentId) {
	const cleanAssignmentId = validateNumeric(assignmentId);
	const res = await fetch(`${BASE_URL}/review-assignments/${cleanAssignmentId}/results`);
	if (!res.ok) {
		throw new Error(await res.text());
	}
	const data = await res.json();
	return Array.isArray(data) ? data : data?.results ?? [];
}

export async function updateReviewAssignmentStatus(fetch, { assignmentId, status }) {
        const cleanAssignmentId = validateNumeric(assignmentId);
        const cleanStatus = validateString(status);

        if (!['active', 'completed', 'cancelled'].includes(cleanStatus)) {
                throw new Error('Invalid status. Must be active, completed, or cancelled');
        }

        const res = await fetch(`${BASE_URL}/review-assignments/${cleanAssignmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: cleanStatus })
        });
        if (!res.ok) {
                throw new Error(await res.text());
        }
        return res.json();
}

export async function deleteReviewAssignment(fetch, assignmentId) {
        const cleanAssignmentId = validateNumeric(assignmentId);

        const res = await fetch(`${BASE_URL}/review-assignments/${cleanAssignmentId}`, {
                method: 'DELETE'
        });
        if (!res.ok) {
                throw new Error(await res.text());
        }
        return res.json();
}

export async function updateReviewAssignment(
        fetch,
        { assignmentId, title, description }
) {
        const cleanAssignmentId = validateNumeric(assignmentId);
        const cleanTitle = validateString(title);
        const cleanDescription = validateString(description || '');

        const res = await fetch(`${BASE_URL}/review-assignments/${cleanAssignmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: cleanTitle, description: cleanDescription })
        });
        if (!res.ok) {
                throw new Error(await res.text());
        }
        return res.json();
}
