<script>
	import { user } from '$lib/user';
	import {
		uploadTestData,
		setTestActive,
		assignTest,
		getTeacherResults,
		getAttemptAnswers,
		getStudentResults,
		getClassStudents,
		deleteTest,
		getTestQuestions,
		getTestsForTeacher,
		getActiveTests,
		gradeAttemptAnswer
	} from '$lib/api';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let { data } = $props();
	const tests = writable(data.tests ?? []);
	let error = $state(data.error ?? '');

	let testData = $state('');
	let title = $state('');
	let uploadMsg = $state('');
	let selectedTestId = $state(''); // For updating existing tests
	let updateMode = $state(false); // Toggle between create and update
	let previewQuestions = $state([]); // Parsed questions for preview
	let existingQuestions = $state([]); // Existing questions when updating
	let isUploading = $state(false); // Loading state
	let uploadProgress = $state(0); // Progress percentage

	async function handleUpload() {
		if (!$user || $user.role !== 'teacher') {
			uploadMsg = 'You must be logged in as a teacher to upload tests.';
			return;
		}
		if (!testData.trim()) {
			uploadMsg = 'Please enter test data';
			return;
		}

		// Start loading state
		isUploading = true;
		uploadProgress = 0;
		uploadMsg = '';

		try {
			// Simulate progress based on number of questions for user feedback
			const questionCount = previewQuestions.length;
			const progressIncrement = questionCount > 0 ? 90 / questionCount : 90;
			let currentProgress = 0;

			// Progress simulation
			const progressInterval = setInterval(() => {
				if (currentProgress < 80) {
					currentProgress += progressIncrement;
					uploadProgress = Math.min(currentProgress, 80);
				}
			}, 100);

			const testId = updateMode && selectedTestId ? selectedTestId : undefined;
			const actionWord = updateMode ? 'Updated' : 'Created';

			await uploadTestData(fetch, {
				data: testData,
				title: title.trim(),
				teacherId: $user.id,
				testId
			});

			// Complete progress
			clearInterval(progressInterval);
			uploadProgress = 100;

			// Short delay to show completion
			setTimeout(() => {
				uploadMsg = actionWord;
				// Clear form
				testData = '';
				title = '';
				if (updateMode) {
					selectedTestId = '';
				}
				isUploading = false;
				uploadProgress = 0;
			}, 500);
		} catch (err) {
			isUploading = false;
			uploadProgress = 0;
			uploadMsg = err.message || 'Upload failed';
		}
	}

	function downloadTemplate() {
		// Create sample content with proper CSV format including sections
		const csvContent = `[SECTION:Constitutional Law:3]
1,"When must an appellate court have subject-matter jurisdiction?","When the notice of appeal is filed","When oral argument occurs","When a decision is issued","All of the above",d
2,"What is the primary source of law in most legal systems?",Constitution,Statutes,"Case Law",Regulations,a
3,"Which amendment to the US Constitution protects freedom of speech?",First,Second,Fourth,Fifth,a
4,"The Fourth Amendment protects against what type of searches?","All searches","Unreasonable searches","Police searches","Federal searches",b
5,"What is the supremacy clause?","Makes federal law supreme","Gives states power","Limits Congress","Creates courts",a

[SECTION:Contract Law:2]
6,"In contract law, what is consideration?","A written document","Something of value exchanged","A court hearing","Legal advice",b
7,"What makes a contract legally binding?",Writing,Signatures,"Offer and acceptance",Witnesses,c
8,"What does 'pro bono' mean in legal terms?","For the public good (free legal work)","Professional bonus","Proven guilty","Private business",a
9,"Which court has the highest authority in the US legal system?","District Court","Court of Appeals","Supreme Court","State Court",c

[SECTION:Essay Questions:1]
10,"Explain the difference between civil and criminal law, including examples of each."
11,"Discuss the concept of precedent in common law systems and how it affects legal decision-making."
12,"Analyze the relationship between federal and state jurisdiction in the US legal system."`;

		// Create a blob with the CSV content
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

		// Create a download link
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', 'law_test_template.csv');
		link.style.visibility = 'hidden';

		// Add to document, click, and remove
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Simple CSV parser that handles quoted strings
	function parseCSVLine(line) {
		const result = [];
		let current = '';
		let inQuotes = false;
		let i = 0;

		while (i < line.length) {
			const char = line[i];

			if (char === '"' && (i === 0 || line[i - 1] === ',' || inQuotes)) {
				if (inQuotes && line[i + 1] === '"') {
					// Escaped quote
					current += '"';
					i += 2;
					continue;
				}
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				result.push(current.trim());
				current = '';
			} else {
				current += char;
			}
			i++;
		}

		result.push(current.trim());
		return result;
	}

	function parseTestData(data) {
		if (!data.trim()) {
			return [];
		}

		const lines = data
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);

		const sections = [];
		let currentSection = null;
		let sectionOrder = 1;

		for (const line of lines) {
			const cols = parseCSVLine(line);

			// Check if this is a section definition line
			// Format: [SECTION:SectionName:TotalQuestions]
			if (cols.length === 1 && cols[0].startsWith('[SECTION:') && cols[0].endsWith(']')) {
				const sectionDef = cols[0].slice(9, -1); // Remove [SECTION: and ]
				const sectionParts = sectionDef.split(':');
				if (sectionParts.length >= 2) {
					const sectionName = sectionParts[0].trim();
					const totalQuestions = parseInt(sectionParts[1]) || 1;

					currentSection = {
						name: sectionName,
						order: sectionOrder++,
						totalQuestions: totalQuestions,
						questions: [],
						status: 'new'
					};
					sections.push(currentSection);
				}
				continue;
			}

			if (cols.length < 2) {
				continue; // Skip malformed lines - need at least Question ID and Question Text
			}

			const questionId = cols[0].trim();
			const questionText = cols[1].trim();

			// Check if this is a long response question (only Question ID and Question Text)
			let isLongResponse =
				cols.length === 2 || (cols.length > 2 && cols.slice(2).every((col) => !col.trim()));
			let choices = [];

			if (!isLongResponse) {
				// Multiple choice question - need at least 7 columns
				if (cols.length >= 7) {
					const answer1 = cols[2].trim();
					const answer2 = cols[3].trim();
					const answer3 = cols[4].trim();
					const answer4 = cols[5].trim();
					const correctAnswer = cols[6].trim().toLowerCase();

					// Check if any of the required fields are empty for multiple choice
					if (!answer1 && !answer2 && !answer3 && !answer4) {
						isLongResponse = true;
					} else {
						const correctIndex =
							correctAnswer === 'a'
								? 0
								: correctAnswer === 'b'
									? 1
									: correctAnswer === 'c'
										? 2
										: correctAnswer === 'd'
											? 3
											: -1;

						choices = [
							{ text: answer1, isCorrect: correctIndex === 0 },
							{ text: answer2, isCorrect: correctIndex === 1 },
							{ text: answer3, isCorrect: correctIndex === 2 },
							{ text: answer4, isCorrect: correctIndex === 3 }
						];
					}
				} else {
					isLongResponse = true;
				}
			}

			const question = {
				questionId,
				questionText,
				choices,
				isLongResponse,
				status: 'new'
			};

			// Add question to current section or create default section
			if (!currentSection) {
				currentSection = {
					name: 'Default Section',
					order: sectionOrder++,
					totalQuestions: 999, // Default to include all questions
					questions: [],
					status: 'new'
				};
				sections.push(currentSection);
			}

			currentSection.questions.push(question);
		}

		// Flatten sections into questions for backward compatibility with preview
		// But also store the section structure
		const allQuestions = [];
		sections.forEach((section) => {
			section.questions.forEach((question) => {
				question.sectionName = section.name;
				question.sectionOrder = section.order;
				question.sectionTotalQuestions = section.totalQuestions;
				allQuestions.push(question);
			});
		});

		// Store sections for preview enhancement
		allQuestions._sections = sections;

		return allQuestions;
	}

	async function loadExistingQuestions() {
		if (!updateMode || !selectedTestId || !$user) {
			existingQuestions = [];
			return;
		}

		try {
			existingQuestions = await getTestQuestions(fetch, {
				testId: selectedTestId,
				teacherId: $user.id
			});
		} catch (err) {
			existingQuestions = [];
			console.error('Failed to load existing questions:', err);
		}
	}

	function compareQuestions(newQuestions, existingQuestions) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const existingMap = new Map();
		existingQuestions.forEach((q) => {
			existingMap.set(q.questionId, q);
		});

		return newQuestions.map((newQ) => {
			const existing = existingMap.get(newQ.questionId);
			if (!existing) {
				return { ...newQ, status: 'added' };
			}

			// Check if question or choices changed
			const questionChanged = existing.questionText !== newQ.questionText;
			const choicesChanged = existing.choices.some((existingChoice, index) => {
				const newChoice = newQ.choices[index];
				return (
					!newChoice ||
					existingChoice.text !== newChoice.text ||
					existingChoice.isCorrect !== newChoice.isCorrect
				);
			});

			if (questionChanged || choicesChanged) {
				return { ...newQ, status: 'changed' };
			}

			return { ...newQ, status: 'unchanged' };
		});
	}

	async function toggleActive(t) {
		if (!$user || $user.role !== 'teacher') {
			error = 'You must be logged in as a teacher to manage tests.';
			return;
		}
		try {
			await setTestActive(fetch, {
				testId: t.id,
				teacherId: $user.id,
				isActive: !t.is_active
			});
			tests.update((ts) => ts.map((x) => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)));
		} catch {
			error = 'Failed to update test';
		}
	}

	async function handleDeleteTest(t) {
		if (!$user || $user.role !== 'teacher') {
			error = 'You must be logged in as a teacher to delete tests.';
			return;
		}

		const confirmed = confirm(
			`Are you sure you want to delete "${t.title}"? This will permanently remove the test and all associated questions and answers. This action cannot be undone.`
		);

		if (!confirmed) return;

		try {
			await deleteTest(fetch, {
				testId: t.id,
				teacherId: $user.id
			});
			tests.update((ts) => ts.filter((x) => x.id !== t.id));
		} catch (err) {
			error = err.message || 'Failed to delete test';
		}
	}

	let assignTestId = $state('');
	const students = writable([]);
	let selectedStudentId = $state('');
	let assignMsg = $state('');

	async function loadStudents() {
		if (!$user || $user.role !== 'teacher') {
			return;
		}
		try {
			const res = await getClassStudents(fetch, $user.id);
			students.set(Array.isArray(res) ? res : (res?.data ?? []));
		} catch {
			students.set([]);
		}
	}

	async function loadTests() {
		if (!$user) {
			tests.set([]);
			return;
		}
		try {
			let res;
			if ($user.role === 'teacher') {
				res = await getTestsForTeacher(fetch, $user.id);
			} else {
				res = await getActiveTests(fetch);
			}
			tests.set(Array.isArray(res) ? res : (res?.data ?? []));
		} catch (err) {
			error = err.message;
			tests.set([]);
		}
	}

	onMount(() => {
		loadStudents();
		loadTests();
		if ($user?.role === 'teacher') {
			loadTeacherResults();
		}
		if ($user?.role === 'student') {
			loadStudentResults();
		}
	});

       function updatePreview() {
               const parsed = parseTestData(testData);
               if (updateMode && existingQuestions.length > 0) {
                       previewQuestions = compareQuestions(parsed, existingQuestions);
               } else {
                       previewQuestions = parsed.map((q) => ({ ...q, status: 'added' }));
               }
               previewQuestions._sections = parsed._sections;
       }

       // Reactive preview update when test data changes
       $effect(updatePreview);

	// Load existing questions when update mode or selected test changes
	$effect(() => {
		if (updateMode && selectedTestId) {
			loadExistingQuestions();
		} else {
			existingQuestions = [];
		}
	});

	// Reactive loading when user state changes
	$effect(() => {
		if ($user) {
			loadTests();
			if ($user.role === 'teacher') {
				loadStudents();
				loadTeacherResults();
			} else if ($user.role === 'student') {
				loadStudentResults();
			}
		} else {
			tests.set([]);
		}
	});

	async function handleAssign() {
		if (!$user || $user.role !== 'teacher') {
			assignMsg = 'You must be logged in as a teacher to assign tests.';
			return;
		}
		const selectedStudent = $students.find((s) => s.id == selectedStudentId);
		if (!selectedStudent) {
			assignMsg = 'Student not found';
			return;
		}

		try {
			await assignTest(fetch, {
				testId: assignTestId,
				studentId: selectedStudentId,
				studentName: selectedStudent.name
			});
			assignMsg = 'Assigned';
		} catch (e) {
			assignMsg = e.message;
		}
	}

	const teacherResults = writable([]);
	const attemptAnswers = writable({});

	async function loadTeacherResults() {
		if (!$user || $user.role !== 'teacher') {
			return;
		}
		try {
			const res = await getTeacherResults(fetch, $user.id);
			teacherResults.set(Array.isArray(res) ? res : (res?.data ?? []));
		} catch {
			teacherResults.set([]);
		}
	}

	async function loadAttemptAnswers(id) {
		try {
			const res = await getAttemptAnswers(fetch, id);
			attemptAnswers.update((m) => ({
				...m,
				[id]: Array.isArray(res) ? res : (res?.data ?? [])
			}));
		} catch {
			attemptAnswers.update((m) => ({ ...m, [id]: [] }));
		}
	}

	async function toggleCorrect(attemptId, answer) {
		const newCorrect = !answer.is_correct;
		const points = newCorrect ? answer.points : 0;
		await gradeAttemptAnswer(fetch, {
			answerId: answer.id,
			isCorrect: newCorrect,
			pointsAwarded: points
		});
		await loadTeacherResults();
		await loadAttemptAnswers(attemptId);
	}

	async function saveFreeResponse(attemptId, answer) {
		const pts = Number(answer.points_awarded || 0);
		await gradeAttemptAnswer(fetch, {
			answerId: answer.id,
			isCorrect: pts > 0,
			pointsAwarded: pts
		});
		await loadTeacherResults();
		await loadAttemptAnswers(attemptId);
	}

	const studentResults = writable([]);

	async function loadStudentResults() {
		if (!$user || $user.role !== 'student') {
			return;
		}
		try {
			const res = await getStudentResults(fetch, $user.id);
			studentResults.set(Array.isArray(res) ? res : (res?.data ?? []));
		} catch {
			studentResults.set([]);
		}
	}
</script>

<div class="app-container">
	<header class="main-header">
		<div class="header-content">
			<h1 class="brand-title">
				<span class="law-icon">⚖️</span>
				Law Test Randomizer
			</h1>
			<nav class="header-nav">
				<a href="/admin" class="admin-link">Admin Dashboard</a>
			</nav>
		</div>
	</header>

	<main class="main-content">
		{#if error}
			<div class="alert error-alert">
				<span class="alert-icon">❌</span>
				{error}
			</div>
		{/if}

		{#if $user}
			{#if $user.role === 'teacher'}
				<div class="dashboard teacher-dashboard">
					<div class="dashboard-grid">
						<!-- Full-width Upload Section -->
						<section class="card upload-card full-width">
							<div class="card-header">
								<h2 class="card-title">
									<span class="section-icon">📝</span>
									Create or Update Test
								</h2>
							</div>
							<div class="card-content">
								<div class="template-section">
									<div class="template-info">
										<h4>📋 Need a starting point?</h4>
									</div>
									<button onclick={downloadTemplate} class="btn btn-outline btn-sm template-btn">
										<span class="btn-icon">📥</span>
										Download Template
									</button>
								</div>

								<div class="mode-selector">
									<div class="mode-toggle">
										<label class="toggle-option">
											<input type="radio" bind:group={updateMode} value={false} />
											<span>🆕 Create New Test</span>
										</label>
										<label class="toggle-option">
											<input type="radio" bind:group={updateMode} value={true} />
											<span>🔄 Update Existing Test</span>
										</label>
									</div>
								</div>

								{#if updateMode}
									<div class="form-group">
										<label for="test-select">Select Test to Update</label>
										<select
											id="test-select"
											bind:value={selectedTestId}
											class="form-select"
											onchange={() => {
												const test = $tests.find((t) => t.id == selectedTestId);
												if (test) {
													title = test.title;
												}
											}}
										>
											<option value="">Choose a test...</option>
											{#each $tests as test (test.id)}
												<option value={test.id}>{test.title}</option>
											{/each}
										</select>
									</div>
								{/if}

								<div class="form-group">
									<label for="title-input">Test Title</label>
									<input
										id="title-input"
										type="text"
										placeholder="Enter test title..."
										bind:value={title}
										class="form-input"
									/>
								</div>

								<div class="form-group">
									<label for="test-data">Test Data & Preview</label>
									<div class="data-preview-container">
										<div class="data-input-section">
											<textarea
												id="test-data"
												placeholder="Paste your test data here. Use CSV format with commas to separate columns. Download template for examples."
                                                                                                bind:value={testData}
                                                                                                on:input={updatePreview}
                                                                                                class="form-textarea"
                                                                                                rows="12"
                                                                                        ></textarea>
										</div>
										<div class="preview-section">
											<div class="preview-header">
												<h4>📋 Preview</h4>
												{#if previewQuestions.length > 0}
													<span class="question-count">{previewQuestions.length} questions</span>
												{/if}
											</div>
											<div class="preview-content">
												{#if previewQuestions.length === 0}
													<div class="preview-empty">
														<span class="empty-icon">📝</span>
														<p>Paste your test data to see a preview</p>
													</div>
												{:else if previewQuestions._sections && previewQuestions._sections.length > 1}
													<!-- Section-based preview -->
													{#each previewQuestions._sections as section (section.name)}
														<div class="section-preview">
															<div class="section-header">
																<span class="section-icon">📂</span>
																<span class="section-name">{section.name}</span>
																<span class="section-info">
																	{section.totalQuestions} of {section.questions.length} questions will
																	be selected
																</span>
															</div>
															{#each section.questions as question, index (question.questionId)}
																<div
																	class="preview-question {question.status} {question.isLongResponse
																		? 'long-response'
																		: ''} in-section"
																>
																	<div class="question-header">
																		<span class="question-number">{index + 1}.</span>
																		<span class="question-id">{question.questionId}</span>
																		{#if question.isLongResponse}
																			<span class="question-type-badge">📝 Long Response</span>
																		{/if}
																		<span class="status-badge {question.status}">
																			{question.status === 'added'
																				? '✅ New'
																				: question.status === 'changed'
																					? '⚠️ Changed'
																					: '✓ Unchanged'}
																		</span>
																	</div>
																	<div class="question-text">{question.questionText}</div>
																	{#if question.isLongResponse}
																		<div class="long-response-indicator">
																			<span class="long-response-text"
																				>📝 Students will provide a written response</span
																			>
																		</div>
																	{:else}
																		<div class="choices-preview">
																			{#each question.choices as choice, choiceIndex (choiceIndex)}
																				<div
																					class="choice-preview {choice.isCorrect ? 'correct' : ''}"
																				>
																					<span class="choice-label"
																						>{String.fromCharCode(97 + choiceIndex)}.</span
																					>
																					{choice.text}
																					{#if choice.isCorrect}<span class="correct-indicator"
																							>✓</span
																						>{/if}
																				</div>
																			{/each}
																		</div>
																	{/if}
																</div>
															{/each}
														</div>
													{/each}
												{:else}
													<!-- Regular question list preview -->
													{#each previewQuestions as question, index (question.questionId)}
														<div
															class="preview-question {question.status} {question.isLongResponse
																? 'long-response'
																: ''}"
														>
															<div class="question-header">
																<span class="question-number">{index + 1}.</span>
																<span class="question-id">{question.questionId}</span>
																{#if question.isLongResponse}
																	<span class="question-type-badge">📝 Long Response</span>
																{/if}
																<span class="status-badge {question.status}">
																	{question.status === 'added'
																		? '✅ New'
																		: question.status === 'changed'
																			? '⚠️ Changed'
																			: '✓ Unchanged'}
																</span>
															</div>
															<div class="question-text">{question.questionText}</div>
															{#if question.isLongResponse}
																<div class="long-response-indicator">
																	<span class="long-response-text"
																		>📝 Students will provide a written response</span
																	>
																</div>
															{:else}
																<div class="choices-preview">
																	{#each question.choices as choice, choiceIndex (choiceIndex)}
																		<div class="choice-preview {choice.isCorrect ? 'correct' : ''}">
																			<span class="choice-label"
																				>{String.fromCharCode(97 + choiceIndex)}.</span
																			>
																			{choice.text}
																			{#if choice.isCorrect}<span class="correct-indicator">✓</span
																				>{/if}
																		</div>
																	{/each}
																</div>
															{/if}
														</div>
													{/each}
												{/if}
											</div>
										</div>
									</div>
								</div>
								<button
									onclick={handleUpload}
									class="btn btn-primary"
									disabled={(updateMode && !selectedTestId) || isUploading}
								>
									{#if isUploading}
										<span class="btn-spinner">⏳</span>
										{updateMode ? 'Updating...' : 'Creating...'}
									{:else}
										{updateMode ? '🔄 Update Test' : '📋 Create Test'}
									{/if}
								</button>

								{#if isUploading}
									<div class="upload-progress">
										<div class="progress-bar">
											<div class="progress-fill" style="width: {uploadProgress}%"></div>
										</div>
										<div class="progress-text">
											{uploadProgress < 100 ? 'Processing questions...' : 'Finalizing...'}
											{Math.round(uploadProgress)}%
										</div>
									</div>
								{/if}

								{#if uploadMsg && !isUploading}
									<div
										class="status-message {uploadMsg === 'Created' || uploadMsg === 'Updated'
											? 'success'
											: 'error'}"
									>
										{uploadMsg}
									</div>
								{/if}
							</div>
						</section>

						<!-- Tests Management -->
						<section class="card tests-card">
							<div class="card-header">
								<h2 class="card-title">
									<span class="section-icon">📋</span>
									Manage Tests
								</h2>
							</div>
							<div class="card-content">
								{#if $tests.length}
									<div class="tests-grid">
										{#each $tests as t (t.id)}
											<div class="test-item {t.is_active ? 'active' : 'inactive'}">
												<div class="test-header">
													<a href={`/tests/${t.id}`} class="test-link">
														{t.title}
													</a>
													<div class="test-status">
														<span class="status-indicator {t.is_active ? 'active' : 'inactive'}">
															{t.is_active ? 'Active' : 'Inactive'}
														</span>
													</div>
												</div>
												<div class="test-actions">
													<button
														onclick={() => toggleActive(t)}
														class="btn {t.is_active ? 'btn-warning' : 'btn-success'} btn-sm"
													>
														{t.is_active ? 'Deactivate' : 'Activate'}
													</button>
													<button
														onclick={() => handleDeleteTest(t)}
														class="btn btn-danger btn-sm"
														title="Delete test permanently"
													>
														🗑️ Delete
													</button>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="empty-state">
										<span class="empty-icon">📚</span>
										<p>No tests available. Upload your first test above!</p>
									</div>
								{/if}
							</div>
						</section>

						<!-- Assignment Section -->
						<section class="card assign-card">
							<div class="card-header">
								<h2 class="card-title">
									<span class="section-icon">🎯</span>
									Assign Test to Student
								</h2>
							</div>
							<div class="card-content">
								<div class="assign-form">
									<div class="form-row">
										<div class="form-group">
											<label for="test-select">Select Test</label>
											<select id="test-select" bind:value={assignTestId} class="form-select">
												<option value="">Choose a test...</option>
												{#each $tests as t (t.id)}
													<option value={t.id}>{t.title}</option>
												{/each}
											</select>
										</div>
										<div class="form-group">
											<label for="student-select">Select Student</label>
											<select
												id="student-select"
												bind:value={selectedStudentId}
												class="form-select"
											>
												<option value="">Choose a student...</option>
												{#each $students as s (s.id)}
													<option value={s.id}>{s.name}</option>
												{/each}
											</select>
										</div>
									</div>
									<button onclick={handleAssign} class="btn btn-primary"> Assign Test </button>
									{#if assignMsg}
										<div class="status-message {assignMsg === 'Assigned' ? 'success' : 'error'}">
											{assignMsg}
										</div>
									{/if}
								</div>
							</div>
						</section>

						<!-- Results Section -->
						<section class="card results-card">
							<div class="card-header">
								<h2 class="card-title">
									<span class="section-icon">📊</span>
									Test Results
								</h2>
							</div>
							<div class="card-content">
								{#if $teacherResults.length}
									<div class="results-list">
										{#each $teacherResults as r (r.id)}
											<details class="result-details">
												<summary
													class="result-summary"
													onclick={(e) => {
														if (r.completed_at) {
															const details = e.target.parentElement;
															if (!details.open) {
																loadAttemptAnswers(r.id);
															}
														}
													}}
												>
													<div class="result-info">
														<span class="student-name">{r.student_name}</span>
														<span class="test-title">{r.title}</span>
													</div>
													{#if r.score !== null}
														<span class="score-badge">
															Score: {r.score}
														</span>
													{:else}
														<span class="status-badge pending"> Pending </span>
													{/if}
												</summary>
												<div class="result-content">
													{#if r.completed_at}
														{#if $attemptAnswers[r.id]?.length}
															<div class="answers-list">
																{#each $attemptAnswers[r.id] as a (a.id)}
																	<div class="answer-item">
																		<div class="question-text">
																			{a.question_text} ({a.points} pts)
																		</div>
																		{#if a.choice_text}
																			<div class="choice-text">
																				{a.choice_text}
																				<span class="result-icon">{a.is_correct ? '✅' : '❌'}</span
																				>
																				<button
																					class="override-btn"
																					onclick={() => toggleCorrect(r.id, a)}>Override</button
																				>
																			</div>
																		{:else}
																			<div class="choice-text">
																				<div class="response-text">{a.answer_text}</div>
																				<input
																					type="number"
																					min="0"
																					max={a.points}
																					bind:value={a.points_awarded}
																					class="grade-input"
																				/>
																				<button
																					class="override-btn"
																					onclick={() => saveFreeResponse(r.id, a)}>Save</button
																				>
																			</div>
																		{/if}
																	</div>
																{/each}
															</div>
														{:else}
															<div class="empty-state">
																<p>Loading answers...</p>
															</div>
														{/if}
													{:else}
														<div class="empty-state">
															<p>Test has not been taken yet.</p>
														</div>
													{/if}
												</div>
											</details>
										{/each}
									</div>
								{:else}
									<div class="empty-state">
										<span class="empty-icon">📈</span>
										<p>No results yet. Click "Refresh Results" to check for new submissions.</p>
									</div>
								{/if}
							</div>
						</section>
					</div>
					<!-- Close dashboard-grid -->
				</div>
				<!-- Close teacher-dashboard -->
			{/if}

			{#if $user.role === 'student'}
				<div class="dashboard student-dashboard">
					<div class="dashboard-grid">
						<!-- My Tests -->
						<section class="card student-tests-card">
							<div class="card-header">
								<h2 class="card-title">
									<span class="section-icon">📝</span>
									My Tests
								</h2>
							</div>
							<div class="card-content">
								{#if $studentResults.length}
									<div class="student-tests">
										{#each $studentResults as r (r.test_id)}
											<div
												class="test-item {r.completed_at
													? r.score == null
														? 'pending'
														: 'completed'
													: 'pending'}"
											>
												{#if !r.completed_at}
													<a href={`/tests/${r.test_id}`} class="test-link pending">
														<div class="test-info">
															<span class="test-title">{r.title}</span>
															<span class="test-status">Ready to take</span>
														</div>
														<span class="action-indicator">→</span>
													</a>
												{:else if r.score == null}
													<div class="completed-test">
														<div class="test-info">
															<span class="test-title">{r.title}</span>
															<span class="test-status completed">Pending Review</span>
														</div>
													</div>
												{:else}
													<div class="completed-test">
														<div class="test-info">
															<span class="test-title">{r.title}</span>
															<span class="test-status completed">Completed</span>
														</div>
														<span class="score-display">Score: {r.score}</span>
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{:else}
									<div class="empty-state">
										<span class="empty-icon">📚</span>
										<p>No tests assigned yet. Join a class to get started!</p>
									</div>
								{/if}
							</div>
						</section>
					</div>
				</div>
			{/if}
		{:else}
			<div class="welcome-section">
				<div class="welcome-content">
					<h2>Welcome to Law Test Randomizer</h2>
					<p>Please log in to access your dashboard and manage your tests.</p>
					<a href="/login" class="btn btn-primary btn-large"> Log In to Continue </a>
				</div>
			</div>
		{/if}
	</main>
</div>

<style>
	* {
		box-sizing: border-box;
	}

	.app-container {
		min-height: 100vh;
		background: #ffffff;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		color: #1f2937;
	}

	.main-header {
		background: #ffffff;
		border-bottom: 1px solid #e5e7eb;
		padding: 1.5rem 0;
		margin-bottom: 2rem;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.brand-title {
		font-size: 1.875rem;
		font-weight: 800;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #111827;
		letter-spacing: -0.025em;
	}

	.law-icon {
		font-size: 2rem;
	}

	.header-nav {
		display: flex;
		align-items: center;
	}

	.admin-link {
		padding: 0.625rem 1.25rem;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		border: none;
		border-radius: 8px;
		color: white;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.875rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
		letter-spacing: -0.01em;
	}

	.admin-link:hover {
		background: linear-gradient(135deg, #1d4ed8, #1e40af);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
	}

	.main-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 12px;
		margin-bottom: 2rem;
		font-weight: 500;
		animation: slideIn 0.3s ease-out;
	}

	.error-alert {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #dc2626;
	}

	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2rem;
	}

	.card {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition:
			transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
			border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		animation: fadeInUp 0.5s ease-out;
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		border-color: #d1d5db;
	}

	.card-header {
		padding: 1.5rem;
		border-bottom: 1px solid #f3f4f6;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #fafafa;
	}

	.card-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.section-icon {
		font-size: 1.5rem;
	}

	.card-content {
		padding: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.form-input,
	.form-select {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		font-size: 1rem;
		transition:
			border-color 0.3s ease,
			box-shadow 0.3s ease;
		background: rgba(255, 255, 255, 0.8);
	}

	.form-input:focus,
	.form-select:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.form-textarea {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		font-size: 0.9rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		transition:
			border-color 0.3s ease,
			box-shadow 0.3s ease;
		background: rgba(248, 250, 252, 0.8);
		resize: none;
		height: 400px;
	}

	.form-textarea:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
		background: white;
	}

	.mode-selector {
		margin-bottom: 1.5rem;
	}

	.mode-toggle {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: rgba(59, 130, 246, 0.05);
		border-radius: 12px;
		border: 1px solid rgba(59, 130, 246, 0.2);
	}

	.toggle-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		font-weight: 500;
	}

	.toggle-option:hover {
		background: rgba(59, 130, 246, 0.1);
	}

	.toggle-option input[type='radio'] {
		margin: 0;
	}

	/* Template Section */
	.template-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.template-info h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1f2937;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.template-btn {
		flex-shrink: 0;
		margin-left: 1rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.3s ease;
		font-size: 1rem;
		gap: 0.5rem;
	}

	.btn-primary {
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		border: none;
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
	}

	.btn-primary:hover {
		background: linear-gradient(135deg, #1d4ed8, #1e40af);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
	}

	.btn-success {
		background: linear-gradient(135deg, #059669, #047857);
		color: white;
		border: none;
		box-shadow: 0 1px 3px rgba(5, 150, 105, 0.12);
	}

	.btn-success:hover {
		background: linear-gradient(135deg, #047857, #065f46);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
	}

	.btn-warning {
		background: linear-gradient(135deg, #f59e0b, #d97706);
		color: white;
		border: none;
		box-shadow: 0 1px 3px rgba(245, 158, 11, 0.12);
	}

	.btn-warning:hover {
		background: linear-gradient(135deg, #d97706, #b45309);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
	}

	.btn-danger {
		background: linear-gradient(135deg, #ef4444, #dc2626);
		color: white;
		border: none;
		box-shadow: 0 1px 3px rgba(239, 68, 68, 0.12);
	}

	.btn-danger:hover {
		background: linear-gradient(135deg, #dc2626, #b91c1c);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn-large {
		padding: 1rem 2rem;
		font-size: 1.125rem;
	}

	.btn-outline {
		background: transparent;
		color: #374151;
		border: 2px solid #d1d5db;
	}

	.btn-outline:hover {
		background: rgba(59, 130, 246, 0.05);
		border-color: #2563eb;
		color: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
	}

	.badge {
		background: linear-gradient(135deg, #ef4444, #dc2626);
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.status-message {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-weight: 500;
		animation: slideIn 0.3s ease-out;
	}

	.status-message.success {
		background: rgba(16, 185, 129, 0.1);
		color: #059669;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.status-message.error {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	.empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.tests-grid {
		display: grid;
		gap: 1rem;
	}

	.test-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border: 2px solid rgba(0, 0, 0, 0.05);
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.5);
		transition: all 0.3s ease;
	}

	.test-item:hover {
		border-color: rgba(102, 126, 234, 0.3);
		background: rgba(102, 126, 234, 0.05);
	}

	.test-item.active {
		border-color: rgba(16, 185, 129, 0.3);
		background: rgba(16, 185, 129, 0.05);
	}

	.test-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.test-link {
		color: #1f2937;
		text-decoration: none;
		font-weight: 600;
		font-size: 1.1rem;
	}

	.test-link:hover {
		color: #667eea;
	}

	.status-indicator {
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.status-indicator.active {
		background: rgba(16, 185, 129, 0.2);
		color: #059669;
	}

	.status-indicator.inactive {
		background: rgba(107, 114, 128, 0.2);
		color: #374151;
	}

	.test-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-shrink: 0;
	}

	/* Full-width Upload Section */
	.upload-card.full-width {
		margin-bottom: 2rem;
		grid-column: 1 / -1;
		width: 100%;
		max-width: none;
	}

	/* Upload Progress Styles */
	.upload-progress {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 8px;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		border-radius: 4px;
		transition: width 0.3s ease;
		position: relative;
	}

	.progress-fill::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 255, 255, 0.3) 50%,
			transparent 100%
		);
		animation: shimmer 1.5s ease-in-out infinite;
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	.progress-text {
		font-size: 0.9rem;
		color: #374151;
		text-align: center;
		font-weight: 500;
	}

	.btn-spinner {
		animation: spin 1s linear infinite;
		display: inline-block;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Preview Pane Styles */
	.data-preview-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-top: 0.5rem;
	}

	.data-input-section {
		display: flex;
		flex-direction: column;
	}

	.preview-section {
		background: rgba(248, 250, 252, 0.8);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		height: 400px;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: rgba(59, 130, 246, 0.05);
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.preview-header h4 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #374151;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.question-count {
		font-size: 0.875rem;
		color: #6b7280;
		background: rgba(59, 130, 246, 0.1);
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-weight: 500;
	}

	.preview-content {
		overflow-y: auto;
		padding: 0.5rem;
		flex-grow: 1;
	}

	.preview-empty {
		text-align: center;
		padding: 3rem 1rem;
		color: #9ca3af;
	}

	.preview-empty .empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
		opacity: 0.6;
	}

	.preview-question {
		margin-bottom: 1rem;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid transparent;
		background: white;
		transition: all 0.2s ease;
	}

	.preview-question.added {
		border-color: rgba(34, 197, 94, 0.3);
		background: rgba(34, 197, 94, 0.05);
	}

	.preview-question.changed {
		border-color: rgba(245, 158, 11, 0.3);
		background: rgba(245, 158, 11, 0.05);
	}

	.preview-question.unchanged {
		border-color: rgba(107, 114, 128, 0.2);
		background: rgba(249, 250, 251, 0.5);
	}

	.question-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.question-number {
		font-weight: 700;
		color: #374151;
		min-width: 1.5rem;
	}

	.question-id {
		font-weight: 600;
		color: #6b7280;
		background: rgba(0, 0, 0, 0.05);
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.status-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		margin-left: auto;
	}

	.status-badge.added {
		background: rgba(34, 197, 94, 0.1);
		color: #059669;
	}

	.status-badge.changed {
		background: rgba(245, 158, 11, 0.1);
		color: #d97706;
	}

	.status-badge.pending {
		background-color: #f3f4f6;
		color: #4b5563;
		border: 1px solid #d1d5db;
	}

	.status-badge.unchanged {
		background: rgba(107, 114, 128, 0.1);
		color: #6b7280;
	}

	.question-text {
		font-weight: 500;
		color: #111827;
		margin-bottom: 0.75rem;
		line-height: 1.4;
	}

	.choices-preview {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.choice-preview {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.02);
		font-size: 0.9rem;
		transition: background 0.2s ease;
	}

	.choice-preview.correct {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.2);
		font-weight: 500;
	}

	.choice-label {
		font-weight: 600;
		color: #6b7280;
		min-width: 1.5rem;
	}

	.correct-indicator {
		color: #059669;
		font-weight: 700;
		margin-left: auto;
	}

	/* Long response question styles */
	.preview-question.long-response {
		border-left: 4px solid #8b5cf6;
	}

	.question-type-badge {
		background: rgba(139, 92, 246, 0.1);
		color: #7c3aed;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		margin-right: 0.5rem;
	}

	.long-response-indicator {
		background: rgba(139, 92, 246, 0.05);
		border: 1px solid rgba(139, 92, 246, 0.2);
		border-radius: 6px;
		padding: 0.75rem;
		margin-top: 0.5rem;
	}

	.long-response-text {
		color: #7c3aed;
		font-size: 0.9rem;
		font-weight: 500;
		font-style: italic;
	}

	/* Section preview styles */
	.section-preview {
		margin-bottom: 1.5rem;
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 8px;
		background: rgba(59, 130, 246, 0.02);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: rgba(59, 130, 246, 0.05);
		border-bottom: 1px solid rgba(59, 130, 246, 0.1);
		border-radius: 8px 8px 0 0;
	}

	.section-icon {
		font-size: 1.2rem;
		color: #3b82f6;
	}

	.section-name {
		font-weight: 600;
		color: #1f2937;
		font-size: 1rem;
	}

	.section-info {
		margin-left: auto;
		font-size: 0.875rem;
		color: #6b7280;
		background: rgba(59, 130, 246, 0.1);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-weight: 500;
	}

	.preview-question.in-section {
		margin: 0.75rem;
		margin-bottom: 1rem;
		border-radius: 6px;
		border-left: 3px solid #e5e7eb;
	}

	.preview-question.in-section.long-response {
		border-left-color: #8b5cf6;
	}

	/* Responsive design for preview */
	@media (max-width: 1400px) {
		.data-preview-container {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.preview-section {
			order: 2;
		}

		.data-input-section {
			order: 1;
		}
	}

	/* Enhanced responsive layout */
	@media (max-width: 1200px) {
		.upload-card.full-width {
			margin-left: 0;
			margin-right: 0;
		}
	}

	.student-requests {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.request-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: rgba(102, 126, 234, 0.05);
		border-radius: 8px;
		border: 1px solid rgba(102, 126, 234, 0.1);
	}

	.student-name {
		font-weight: 600;
		color: #374151;
	}

	.assign-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.results-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.result-details {
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.5);
		transition: all 0.3s ease;
	}

	.result-details:hover {
		border-color: rgba(102, 126, 234, 0.3);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.result-summary {
		padding: 1rem;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(102, 126, 234, 0.03);
		transition: background-color 0.3s ease;
		list-style: none;
	}

	.result-summary::-webkit-details-marker {
		display: none;
	}

	.result-summary:hover {
		background: rgba(102, 126, 234, 0.08);
	}

	.result-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.result-info .student-name {
		font-size: 1.1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.test-title {
		font-size: 0.9rem;
		color: #6b7280;
	}

	.score-badge {
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.result-content {
		padding: 1rem;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
		background: rgba(255, 255, 255, 0.8);
	}

	.answers-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.answer-item {
		padding: 0.75rem;
		border-radius: 8px;
		border-left: 4px solid;
	}

	.answer-item.correct {
		background: rgba(16, 185, 129, 0.05);
		border-left-color: #10b981;
	}

	.answer-item.incorrect {
		background: rgba(239, 68, 68, 0.05);
		border-left-color: #ef4444;
	}

	.question-text {
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.choice-text {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #6b7280;
	}

	.result-icon {
		font-size: 1.2rem;
	}

	.response-text {
		margin-bottom: 0.5rem;
	}

	.grade-input {
		width: 4rem;
		margin-right: 0.5rem;
	}

	.override-btn {
		margin-left: 0.5rem;
		padding: 0.25rem 0.5rem;
	}

	.student-tests {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.test-item.pending {
		border-color: rgba(59, 130, 246, 0.3);
		background: rgba(59, 130, 246, 0.05);
	}

	.test-item.completed {
		border-color: rgba(16, 185, 129, 0.3);
		background: rgba(16, 185, 129, 0.05);
	}

	.test-link.pending {
		display: flex;
		justify-content: space-between;
		align-items: center;
		text-decoration: none;
		color: inherit;
		width: 100%;
	}

	.test-link.pending:hover {
		color: #3b82f6;
	}

	.test-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.test-info .test-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.test-status {
		font-size: 0.9rem;
		color: #6b7280;
	}

	.test-status.completed {
		color: #059669;
		font-weight: 600;
	}

	.action-indicator {
		font-size: 1.5rem;
		color: #3b82f6;
		font-weight: bold;
	}

	.completed-test {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.score-display {
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.welcome-section {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.welcome-content {
		text-align: center;
		background: #ffffff;
		padding: 3rem;
		border-radius: 16px;
		box-shadow: 0 4px 25px rgba(0, 0, 0, 0.08);
		border: 1px solid #e5e7eb;
		max-width: 500px;
		animation: fadeInUp 0.6s ease-out;
	}

	.welcome-content h2 {
		font-size: 2rem;
		font-weight: 800;
		margin-bottom: 1rem;
		color: #111827;
		letter-spacing: -0.025em;
	}

	.welcome-content p {
		font-size: 1.1rem;
		color: #6b7280;
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	/* Animations */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.header-content {
			padding: 0 1rem;
			flex-direction: column;
			gap: 1rem;
		}

		.brand-title {
			font-size: 1.5rem;
		}

		.main-content {
			padding: 1rem;
		}

		.dashboard-grid {
			grid-template-columns: 1fr;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.template-section {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}

		.template-btn {
			margin-left: 0;
		}

		.card-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.test-item {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.result-summary {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.request-item {
			flex-direction: column;
			gap: 0.75rem;
			align-items: stretch;
		}

		.completed-test {
			flex-direction: column;
			gap: 0.75rem;
			align-items: flex-start;
		}

		.welcome-content {
			margin: 1rem;
			padding: 2rem;
		}

		.welcome-content h2 {
			font-size: 1.75rem;
		}
	}

	/* Focus states for accessibility */
	.btn:focus,
	.form-input:focus,
	.form-select:focus,
	.test-link:focus,
	.admin-link:focus {
		outline: 2px solid #667eea;
		outline-offset: 2px;
	}

	/* Loading states */
	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	/* Enhanced hover effects */
	.card:hover .section-icon {
		transform: scale(1.1);
		transition: transform 0.3s ease;
	}

	.test-item:hover .action-indicator {
		transform: translateX(4px);
		transition: transform 0.3s ease;
	}

	/* Smooth transitions for dynamic content */
	.tests-grid,
	.results-list,
	.student-requests,
	.student-tests {
		animation: fadeInUp 0.4s ease-out;
	}
</style>
