<script>
	import { user } from '$lib/user';
	import {
		addTeacher,
		addStudent,
		query,
		getTeacher,
		getAllTeachers,
		getAllTestsWithTeachers,
		copyTestToTeacher,
		getAllStudents,
		getClassAssignmentOverview,
		assignStudentToClass,
		removeStudentFromClass,
		getTeacherImages
	} from '$lib/api';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import ImageManager from '$lib/components/ImageManager.svelte';

	let teacherInviteCode = '';
	let teacherName = '';
	let teacherPin = '';
	let teacherMsg = '';
	async function handleAddTeacher() {
		if (!$user || $user.role !== 'teacher') {
			teacherMsg = 'You must be logged in as a teacher to add teachers.';
			return;
		}
		try {
			await addTeacher(fetch, { name: teacherName, pin: teacherPin });
			teacherMsg = 'Teacher added';
			teacherName = '';
			teacherPin = '';
		} catch {
			teacherMsg = 'Failed to add teacher';
		}
	}

	let studentName = '';
	let studentPin = '';
	let studentMsg = '';
	async function handleAddStudent() {
		if (!$user || $user.role !== 'teacher') {
			studentMsg = 'You must be logged in as a teacher to add students.';
			return;
		}
		try {
			await addStudent(fetch, { name: studentName, pin: studentPin, teacherId: $user.id });
			studentMsg = 'Student added';
			studentName = '';
			studentPin = '';
		} catch {
			studentMsg = 'Failed to add student';
		}
	}

	let sql = '';
	const queryOutput = writable('');
	let isQueryRunning = false;
	async function handleQuery() {
		if (!$user || $user.role !== 'teacher') {
			queryOutput.set('You must be logged in as a teacher to run queries.');
			return;
		}
		isQueryRunning = true;
		try {
			const res = await query(fetch, sql);
			queryOutput.set(JSON.stringify(res, null, 2));
		} catch (err) {
			queryOutput.set(err.message);
		} finally {
			isQueryRunning = false;
		}
	}

	function clearQuery() {
		sql = '';
		queryOutput.set('');
	}

	// Test copying variables
	const teachers = writable([]);
	const allTests = writable([]);
	let selectedTestId = '';
	let selectedFromTeacherId = '';
	let selectedToTeacherId = '';
	let newTestTitle = '';
	let copyMsg = '';
	let isCopying = false;

	async function loadTeachersAndTests() {
		try {
			const teachersRes = await getAllTeachers(fetch);
			const testsRes = await getAllTestsWithTeachers(fetch);
			teachers.set(Array.isArray(teachersRes) ? teachersRes : (teachersRes?.data ?? []));
			allTests.set(Array.isArray(testsRes) ? testsRes : (testsRes?.data ?? []));
		} catch (err) {
			console.error('Error loading teachers and tests:', err);
		}
	}

	async function handleCopyTest() {
		if (!$user || $user.role !== 'teacher') {
			copyMsg = 'You must be logged in as a teacher to copy tests.';
			return;
		}

		if (!selectedTestId || !selectedFromTeacherId || !selectedToTeacherId || !newTestTitle.trim()) {
			copyMsg = 'Please fill in all fields.';
			return;
		}

		if (selectedFromTeacherId === selectedToTeacherId) {
			copyMsg = 'Cannot copy test to the same teacher.';
			return;
		}

		isCopying = true;
		copyMsg = '';

		try {
			const result = await copyTestToTeacher(fetch, {
				testId: selectedTestId,
				fromTeacherId: selectedFromTeacherId,
				toTeacherId: selectedToTeacherId,
				newTitle: newTestTitle.trim()
			});

			copyMsg = result.message || 'Test copied successfully!';

			// Reset form
			selectedTestId = '';
			selectedFromTeacherId = '';
			selectedToTeacherId = '';
			newTestTitle = '';
		} catch (err) {
			copyMsg = err.message || 'Failed to copy test';
		} finally {
			isCopying = false;
		}
	}

	// Get tests for selected teacher
	$: availableTests = $allTests.filter((test) => test.teacher_id == selectedFromTeacherId);

	// Class assignment variables
	const allStudents = writable([]);
	const classAssignments = writable([]);
	let selectedStudentId = '';
	let selectedAssignTeacherId = '';
	let assignMsg = '';
	let isAssigning = false;

	async function loadStudentsAndAssignments() {
		try {
			const studentsRes = await getAllStudents(fetch);
			const assignmentsRes = await getClassAssignmentOverview(fetch);
			allStudents.set(Array.isArray(studentsRes) ? studentsRes : (studentsRes?.data ?? []));
			classAssignments.set(
				Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes?.data ?? [])
			);
		} catch (err) {
			console.error('Error loading students and assignments:', err);
		}
	}

	async function handleAssignStudent() {
		if (!$user || $user.role !== 'teacher') {
			assignMsg = 'You must be logged in as a teacher to assign students.';
			return;
		}

		if (!selectedStudentId || !selectedAssignTeacherId) {
			assignMsg = 'Please select both a student and a teacher.';
			return;
		}

		isAssigning = true;
		assignMsg = '';

		try {
			await assignStudentToClass(fetch, {
				studentId: selectedStudentId,
				teacherId: selectedAssignTeacherId
			});

			assignMsg = 'Student assigned to class successfully!';

			// Reset form and reload data
			selectedStudentId = '';
			selectedAssignTeacherId = '';
			await loadStudentsAndAssignments();
		} catch (err) {
			assignMsg = err.message || 'Failed to assign student';
		} finally {
			isAssigning = false;
		}
	}

	async function handleRemoveStudent(studentId, teacherId, studentName, teacherName) {
		if (!confirm(`Remove ${studentName} from ${teacherName}'s class?`)) {
			return;
		}

		try {
			await removeStudentFromClass(fetch, {
				studentId: studentId,
				teacherId: teacherId
			});

			assignMsg = `${studentName} removed from ${teacherName}'s class.`;
			await loadStudentsAndAssignments();
		} catch (err) {
			assignMsg = err.message || 'Failed to remove student';
		}
	}

	// Get students grouped by their assignments
	$: studentGroups = $classAssignments.reduce((groups, assignment) => {
		const key = assignment.student_id;
		if (!groups[key]) {
			groups[key] = {
				student: {
					id: assignment.student_id,
					name: assignment.student_name,
					pin: assignment.student_pin
				},
				teachers: []
			};
		}

		if (assignment.teacher_id) {
			groups[key].teachers.push({
				id: assignment.teacher_id,
				name: assignment.teacher_name
			});
		}

		return groups;
	}, {});

	// Image management variables
	const teacherImages = writable([]);

	async function loadTeacherImages() {
		if (!$user || !$user.id) return;
		try {
			const images = await getTeacherImages(fetch, $user.id);
			teacherImages.set(Array.isArray(images) ? images : images?.data ?? []);
		} catch (err) {
			console.error('Error loading teacher images:', err);
		}
	}

	onMount(async () => {
		if (!$user || $user.role !== 'teacher') {
			goto('/');
		} else {
			const teacher = await getTeacher(fetch, $user.id);
			if (teacher) {
				teacherInviteCode = teacher.invite_code;
			}
			await loadTeachersAndTests();
			await loadStudentsAndAssignments();
			await loadTeacherImages();
		}
	});
</script>

<div class="admin-container">
	<header class="admin-header">
		<div class="header-content">
			<div class="header-left">
				<h1 class="admin-title">
					<span class="admin-icon">⚙️</span>
					Admin Panel
				</h1>
				<p class="admin-subtitle">Manage users and run system queries</p>
			</div>
			<nav class="header-nav">
				<a href="/" class="nav-link">
					<span class="nav-icon">🏠</span>
					Back to Dashboard
				</a>
			</nav>
		</div>
	</header>

	<main class="admin-content">
		{#if $user && $user.role === 'teacher'}
			<div class="admin-grid">
				<!-- Invite Link Section -->
				<section class="admin-card invite-card">
					<div class="card-header">
						<h2 class="card-title">
							<span class="section-icon">📧</span>
							Your Invite Link
						</h2>
					</div>
					<div class="card-content">
						<p>Share this link with your students to have them join your class.</p>
						<div class="form-group">
							<label for="invite-link">Invite Link</label>
							<input
								id="invite-link"
								type="text"
								readonly
								value={typeof window !== 'undefined'
									? `${window.location.origin}/join/${teacherInviteCode}`
									: ''}
								class="form-input"
							/>
						</div>
						<button
							on:click={() =>
								navigator.clipboard.writeText(
									`${window.location.origin}/join/${teacherInviteCode}`
								)}
							class="btn btn-primary"
						>
							<span class="btn-icon">📋</span>
							Copy Link
						</button>
					</div>
				</section>

				<!-- Add Teacher Section -->
				<section class="admin-card teacher-card">
					<div class="card-header">
						<h2 class="card-title">
							<span class="section-icon">👨‍🏫</span>
							Add New Teacher
						</h2>
					</div>
					<div class="card-content">
						<div class="form-group">
							<label for="teacher-name">Teacher Name</label>
							<input
								id="teacher-name"
								type="text"
								placeholder="Enter teacher's full name..."
								bind:value={teacherName}
								class="form-input"
							/>
						</div>
						<div class="form-group">
							<label for="teacher-pin">Teacher PIN</label>
							<input
								id="teacher-pin"
								type="text"
								placeholder="Create a secure PIN..."
								bind:value={teacherPin}
								class="form-input"
							/>
						</div>
						<button
							on:click={handleAddTeacher}
							class="btn btn-primary"
							disabled={!teacherName || !teacherPin}
						>
							<span class="btn-icon">➕</span>
							Add Teacher
						</button>
						{#if teacherMsg}
							<div class="status-message {teacherMsg === 'Teacher added' ? 'success' : 'error'}">
								<span class="status-icon">
									{teacherMsg === 'Teacher added' ? '✅' : '❌'}
								</span>
								{teacherMsg}
							</div>
						{/if}
					</div>
				</section>

				<!-- Add Student Section -->
				<section class="admin-card student-card">
					<div class="card-header">
						<h2 class="card-title">
							<span class="section-icon">👨‍🎓</span>
							Add New Student
						</h2>
					</div>
					<div class="card-content">
						<div class="form-group">
							<label for="student-name">Student Name</label>
							<input
								id="student-name"
								type="text"
								placeholder="Enter student's full name..."
								bind:value={studentName}
								class="form-input"
							/>
						</div>
						<div class="form-group">
							<label for="student-pin">Student PIN</label>
							<input
								id="student-pin"
								type="text"
								placeholder="Create a secure PIN..."
								bind:value={studentPin}
								class="form-input"
							/>
						</div>
						<button
							on:click={handleAddStudent}
							class="btn btn-primary"
							disabled={!studentName || !studentPin}
						>
							<span class="btn-icon">➕</span>
							Add Student
						</button>
						{#if studentMsg}
							<div class="status-message {studentMsg === 'Student added' ? 'success' : 'error'}">
								<span class="status-icon">
									{studentMsg === 'Student added' ? '✅' : '❌'}
								</span>
								{studentMsg}
							</div>
						{/if}
					</div>
				</section>

				<!-- Test Copying Section -->
				<section class="admin-card copy-test-card">
					<div class="card-header">
						<h2 class="card-title">
							<span class="section-icon">📋</span>
							Copy Test Between Teachers
						</h2>
					</div>
					<div class="card-content">
						<div class="form-group">
							<label for="from-teacher-select">Select Source Teacher</label>
							<select
								id="from-teacher-select"
								bind:value={selectedFromTeacherId}
								class="form-input"
							>
								<option value="">Choose source teacher...</option>
								{#each $teachers as teacher (teacher.id)}
									<option value={teacher.id}>{teacher.name}</option>
								{/each}
							</select>
						</div>

						{#if selectedFromTeacherId && availableTests.length > 0}
							<div class="form-group">
								<label for="test-select">Select Test to Copy</label>
								<select
									id="test-select"
									bind:value={selectedTestId}
									class="form-input"
									on:change={() => {
										const selectedTest = availableTests.find((t) => t.id == selectedTestId);
										if (selectedTest) {
											newTestTitle = `${selectedTest.title} (Copy)`;
										}
									}}
								>
									<option value="">Choose test...</option>
									{#each availableTests as test (test.id)}
										<option value={test.id}>
											{test.title}
											{test.is_active ? '(Active)' : '(Inactive)'}
										</option>
									{/each}
								</select>
							</div>
						{/if}

						{#if selectedFromTeacherId && availableTests.length === 0}
							<div class="no-tests-message">
								<span class="info-icon">ℹ️</span>
								This teacher has no tests available to copy.
							</div>
						{/if}

						{#if selectedTestId}
							<div class="form-group">
								<label for="to-teacher-select">Select Destination Teacher</label>
								<select id="to-teacher-select" bind:value={selectedToTeacherId} class="form-input">
									<option value="">Choose destination teacher...</option>
									{#each $teachers as teacher (teacher.id)}
										{#if teacher.id != selectedFromTeacherId}
											<option value={teacher.id}>{teacher.name}</option>
										{/if}
									{/each}
								</select>
							</div>

							<div class="form-group">
								<label for="new-test-title">New Test Title</label>
								<input
									id="new-test-title"
									type="text"
									placeholder="Enter title for the copied test..."
									bind:value={newTestTitle}
									class="form-input"
								/>
							</div>
						{/if}

						<button
							on:click={handleCopyTest}
							class="btn btn-accent"
							disabled={!selectedTestId ||
								!selectedFromTeacherId ||
								!selectedToTeacherId ||
								!newTestTitle.trim() ||
								isCopying}
						>
							{#if isCopying}
								<span class="btn-spinner">⏳</span>
								Copying Test...
							{:else}
								<span class="btn-icon">📋</span>
								Copy Test
							{/if}
						</button>

						{#if copyMsg}
							<div
								class="status-message {copyMsg.includes('successfully') ||
								copyMsg.includes('Success')
									? 'success'
									: 'error'}"
							>
								<span class="status-icon">
									{copyMsg.includes('successfully') || copyMsg.includes('Success') ? '✅' : '❌'}
								</span>
								{copyMsg}
							</div>
						{/if}
					</div>
				</section>
			</div>

			<!-- Student Class Assignment Section -->
			<section class="admin-card assignment-card full-width">
				<div class="card-header">
					<h2 class="card-title">
						<span class="section-icon">👥</span>
						Student Class Assignments
					</h2>
				</div>
				<div class="card-content">
					<!-- Assignment Form -->
					<div class="assignment-form">
						<h3 class="section-subtitle">
							<span class="subtitle-icon">➕</span>
							Assign Student to Class
						</h3>
						<div class="form-row">
							<div class="form-group">
								<label for="student-select">Select Student</label>
								<select id="student-select" bind:value={selectedStudentId} class="form-input">
									<option value="">Choose student...</option>
									{#each $allStudents as student (student.id)}
										<option value={student.id}>{student.name}</option>
									{/each}
								</select>
							</div>
							<div class="form-group">
								<label for="assign-teacher-select">Assign to Teacher</label>
								<select
									id="assign-teacher-select"
									bind:value={selectedAssignTeacherId}
									class="form-input"
								>
									<option value="">Choose teacher...</option>
									{#each $teachers as teacher (teacher.id)}
										<option value={teacher.id}>{teacher.name}</option>
									{/each}
								</select>
							</div>
							<div class="form-group">
								<button
									on:click={handleAssignStudent}
									class="btn btn-primary"
									disabled={!selectedStudentId || !selectedAssignTeacherId || isAssigning}
								>
									{#if isAssigning}
										<span class="btn-spinner">⏳</span>
										Assigning...
									{:else}
										<span class="btn-icon">➕</span>
										Assign to Class
									{/if}
								</button>
							</div>
						</div>
						{#if assignMsg}
							<div
								class="status-message {assignMsg.includes('successfully') ||
								assignMsg.includes('removed')
									? 'success'
									: 'error'}"
							>
								<span class="status-icon">
									{assignMsg.includes('successfully') || assignMsg.includes('removed')
										? '✅'
										: '❌'}
								</span>
								{assignMsg}
							</div>
						{/if}
					</div>

					<!-- Current Assignments Overview -->
					<div class="assignments-overview">
						<h3 class="section-subtitle">
							<span class="subtitle-icon">📋</span>
							Current Class Assignments
						</h3>
						{#if Object.keys(studentGroups).length > 0}
							<div class="assignments-grid">
								{#each Object.values(studentGroups) as group (group.student.id)}
									<div class="student-card">
										<div class="student-info">
											<div class="student-name">{group.student.name}</div>
											<div class="student-pin">PIN: {group.student.pin}</div>
										</div>
										<div class="teacher-assignments">
											{#if group.teachers.length > 0}
												{#each group.teachers as teacher (teacher.id)}
													<div class="teacher-assignment">
														<span class="teacher-name">{teacher.name}</span>
														<button
															class="remove-btn"
															on:click={() =>
																handleRemoveStudent(
																	group.student.id,
																	teacher.id,
																	group.student.name,
																	teacher.name
																)}
															title="Remove from class"
														>
															<span class="remove-icon">✕</span>
														</button>
													</div>
												{/each}
											{:else}
												<div class="no-assignments">
													<span class="no-assign-icon">⚠️</span>
													Not assigned to any class
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="empty-state">
								<span class="empty-icon">📝</span>
								No students found. Add students first to manage class assignments.
							</div>
						{/if}
					</div>
				</div>
			</section>

			<!-- Query Panel Section -->
			<section class="admin-card query-card">
				<div class="card-header">
					<h2 class="card-title">
						<span class="section-icon">🔍</span>
						Database Query Panel
					</h2>
					<div class="query-actions">
						<button
							on:click={clearQuery}
							class="btn btn-secondary btn-sm"
							disabled={!sql && !$queryOutput}
						>
							<span class="btn-icon">🗑️</span>
							Clear
						</button>
					</div>
				</div>
				<div class="card-content">
					<div class="query-section">
						<div class="form-group">
							<label for="sql-query">SQL Query</label>
							<div class="query-input-wrapper">
								<textarea
									id="sql-query"
									rows="6"
									bind:value={sql}
									placeholder="SELECT * FROM users WHERE role = 'student';"
									class="query-textarea"
									disabled={isQueryRunning}
								></textarea>
								<div class="query-toolbar">
									<div class="query-info">
										<span class="query-tip"> 💡 Tip: Use LIMIT to avoid large result sets </span>
									</div>
									<button
										on:click={handleQuery}
										class="btn btn-accent"
										disabled={!sql.trim() || isQueryRunning}
									>
										{#if isQueryRunning}
											<span class="btn-spinner">⏳</span>
											Running...
										{:else}
											<span class="btn-icon">▶️</span>
											Execute Query
										{/if}
									</button>
								</div>
							</div>
						</div>

						{#if $queryOutput}
							<div class="query-results">
								<div class="results-header">
									<h3 class="results-title">
										<span class="results-icon">📊</span>
										Query Results
									</h3>
									<button
										on:click={() => navigator.clipboard.writeText($queryOutput)}
										class="btn btn-outline btn-sm"
										title="Copy to clipboard"
									>
										<span class="btn-icon">📋</span>
										Copy
									</button>
								</div>
								<div class="results-content">
									<pre class="results-output">{$queryOutput}</pre>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</section>

			<!-- Image Manager Section -->
			<section class="admin-card image-manager-card full-width">
				<div class="card-header">
					<h2 class="card-title">
						<span class="section-icon">🖼️</span>
						Image Library
					</h2>
				</div>
				<div class="card-content">
					<ImageManager
						images={$teacherImages}
						on:imagesUploaded={loadTeacherImages}
						on:imageDeleted={loadTeacherImages}
						on:imageUpdated={loadTeacherImages}
					/>
				</div>
			</section>

			<!-- Quick Stats Section -->
			<section class="admin-card stats-card">
				<div class="card-header">
					<h2 class="card-title">
						<span class="section-icon">📈</span>
						System Overview
					</h2>
				</div>
				<div class="card-content">
					<div class="stats-grid">
						<div class="stat-item">
							<div class="stat-icon">👥</div>
							<div class="stat-content">
								<div class="stat-label">Total Users</div>
								<div class="stat-value">-</div>
							</div>
						</div>
						<div class="stat-item">
							<div class="stat-icon">📝</div>
							<div class="stat-content">
								<div class="stat-label">Active Tests</div>
								<div class="stat-value">-</div>
							</div>
						</div>
						<div class="stat-item">
							<div class="stat-icon">📋</div>
							<div class="stat-content">
								<div class="stat-label">Submissions</div>
								<div class="stat-value">-</div>
							</div>
						</div>
						<div class="stat-item">
							<div class="stat-icon">⏰</div>
							<div class="stat-content">
								<div class="stat-label">Last Activity</div>
								<div class="stat-value">-</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		{:else}
			<div class="unauthorized-section">
				<div class="unauthorized-content">
					<div class="unauthorized-icon">🚫</div>
					<h2>Access Denied</h2>
					<p>You do not have permission to view this admin panel.</p>
					<a href="/" class="btn btn-primary">
						<span class="btn-icon">🏠</span>
						Return to Dashboard
					</a>
				</div>
			</div>
		{/if}
	</main>
</div>

<style>
	* {
		box-sizing: border-box;
	}

	.admin-container {
		min-height: 100vh;
		background: #f9fafb;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		color: #111827;
	}

	.admin-header {
		background: #ffffff;
		border-bottom: 1px solid #e5e7eb;
		padding: 2rem 0;
		margin-bottom: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.admin-title {
		font-size: 2.5rem;
		font-weight: 900;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		color: #111827;
		letter-spacing: -0.025em;
	}

	.admin-icon {
		font-size: 2.75rem;
	}

	.admin-subtitle {
		font-size: 1.1rem;
		color: #6b7280;
		margin: 0;
		font-weight: 500;
	}

	.header-nav {
		display: flex;
		align-items: center;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	.nav-link:hover {
		background: linear-gradient(135deg, #1d4ed8, #1e40af);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
	}

	.nav-icon {
		font-size: 1.25rem;
	}

	.admin-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.admin-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 2rem;
	}

	.admin-card {
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

	.admin-card:hover {
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
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.section-icon {
		font-size: 1.75rem;
	}

	.card-content {
		padding: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		font-weight: 700;
		margin-bottom: 0.75rem;
		color: #374151;
		font-size: 1rem;
	}

	.form-input {
		width: 100%;
		padding: 1rem 1.25rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		font-size: 1rem;
		transition: all 0.3s ease;
		background: rgba(255, 255, 255, 0.9);
		font-weight: 500;
	}

	.form-input:focus {
		outline: none;
		border-color: #1e3a8a;
		box-shadow: 0 0 0 4px rgba(30, 58, 138, 0.1);
		background: white;
	}

	.query-input-wrapper {
		position: relative;
	}

	.query-textarea {
		width: 100%;
		padding: 1.25rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		font-size: 1rem;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		transition: all 0.3s ease;
		background: rgba(248, 250, 252, 0.9);
		resize: vertical;
		min-height: 150px;
	}

	.query-textarea:focus {
		outline: none;
		border-color: #1e3a8a;
		box-shadow: 0 0 0 4px rgba(30, 58, 138, 0.1);
		background: white;
	}

	.query-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(248, 250, 252, 0.8);
		border-radius: 8px;
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.query-tip {
		font-size: 0.9rem;
		color: #6b7280;
		font-style: italic;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.875rem 1.75rem;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.3s ease;
		font-size: 1rem;
		gap: 0.75rem;
		position: relative;
		overflow: hidden;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		border: none;
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #1d4ed8, #1e40af);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
	}

	.btn-secondary {
		background: rgba(107, 114, 128, 0.1);
		color: #374151;
		border: 2px solid rgba(107, 114, 128, 0.3);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(107, 114, 128, 0.2);
		transform: translateY(-1px);
	}

	.btn-accent {
		background: linear-gradient(135deg, #059669, #047857);
		color: white;
		box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
	}

	.btn-accent:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 30px rgba(5, 150, 105, 0.4);
	}

	.btn-outline {
		background: transparent;
		color: #374151;
		border: 2px solid rgba(0, 0, 0, 0.2);
	}

	.btn-outline:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.05);
		transform: translateY(-1px);
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		gap: 0.5rem;
	}

	.btn-icon,
	.nav-icon,
	.status-icon,
	.results-icon {
		font-size: 1.2rem;
	}

	.btn-spinner {
		animation: spin 1s linear infinite;
	}

	.status-message {
		margin-top: 1.5rem;
		padding: 1rem 1.25rem;
		border-radius: 12px;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		animation: slideIn 0.3s ease-out;
	}

	.status-message.success {
		background: rgba(5, 150, 105, 0.1);
		color: #047857;
		border: 2px solid rgba(5, 150, 105, 0.3);
	}

	.status-message.error {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		border: 2px solid rgba(239, 68, 68, 0.3);
	}

	.query-results {
		margin-top: 2rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		overflow: hidden;
		background: rgba(248, 250, 252, 0.5);
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		background: rgba(30, 58, 138, 0.05);
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.results-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #1e3a8a;
	}

	.results-content {
		padding: 0;
	}

	.results-output {
		margin: 0;
		padding: 1.5rem;
		background: #1e293b;
		color: #e2e8f0;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.9rem;
		line-height: 1.6;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.stats-card {
		grid-column: 1 / -1;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: rgba(30, 58, 138, 0.05);
		border-radius: 12px;
		border: 1px solid rgba(30, 58, 138, 0.1);
		transition: all 0.3s ease;
	}

	.stat-item:hover {
		background: rgba(30, 58, 138, 0.1);
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(30, 58, 138, 0.1);
	}

	.stat-icon {
		font-size: 2.5rem;
		opacity: 0.8;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.9rem;
		color: #6b7280;
		font-weight: 500;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 800;
		color: #1e3a8a;
	}

	.unauthorized-section {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.unauthorized-content {
		text-align: center;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(15px);
		padding: 4rem 3rem;
		border-radius: 24px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		max-width: 500px;
		animation: fadeInUp 0.6s ease-out;
	}

	.unauthorized-icon {
		font-size: 4rem;
		margin-bottom: 1.5rem;
		opacity: 0.8;
	}

	.unauthorized-content h2 {
		font-size: 2rem;
		margin-bottom: 1rem;
		background: linear-gradient(135deg, #dc2626, #b91c1c);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		font-weight: 800;
	}

	.unauthorized-content p {
		font-size: 1.1rem;
		color: #6b7280;
		margin-bottom: 2.5rem;
		line-height: 1.6;
	}

	.query-actions {
		display: flex;
		gap: 0.75rem;
	}

	/* Enhanced Teacher/Student Card Styling */
	.teacher-card .card-header {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(99, 102, 241, 0.05));
	}

	.student-card .card-header {
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.05));
	}

	.query-card .card-header {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(217, 119, 6, 0.05));
	}

	.copy-test-card .card-header {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(124, 58, 237, 0.05));
	}

	.assignment-card .card-header {
		background: linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(219, 39, 119, 0.05));
	}

	.image-manager-card .card-header {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 38, 0.05));
	}

	.teacher-card:hover {
		box-shadow: 0 20px 60px rgba(59, 130, 246, 0.15);
	}

	.student-card:hover {
		box-shadow: 0 20px 60px rgba(16, 185, 129, 0.15);
	}

	.query-card:hover {
		box-shadow: 0 20px 60px rgba(245, 158, 11, 0.15);
	}

	.copy-test-card:hover {
		box-shadow: 0 20px 60px rgba(139, 92, 246, 0.15);
	}

	.image-manager-card:hover {
		box-shadow: 0 20px 60px rgba(239, 68, 68, 0.15);
	}

	.assignment-card:hover {
		box-shadow: 0 20px 60px rgba(236, 72, 153, 0.15);
	}

	.no-tests-message {
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #2563eb;
		font-weight: 500;
		margin: 1rem 0;
	}

	.info-icon {
		font-size: 1.2rem;
	}

	/* Student assignment styles */
	.full-width {
		grid-column: 1 / -1;
	}

	.section-subtitle {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #374151;
		border-bottom: 2px solid rgba(0, 0, 0, 0.1);
		padding-bottom: 0.75rem;
	}

	.subtitle-icon {
		font-size: 1.25rem;
	}

	.assignment-form {
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 1.5rem;
		align-items: end;
	}

	.assignments-overview {
		margin-top: 2rem;
	}

	.assignments-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.student-card {
		background: rgba(255, 255, 255, 0.8);
		border: 2px solid rgba(236, 72, 153, 0.1);
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.3s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.student-card:hover {
		border-color: rgba(236, 72, 153, 0.3);
		box-shadow: 0 8px 25px rgba(236, 72, 153, 0.1);
		transform: translateY(-2px);
	}

	.student-info {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	.student-name {
		font-size: 1.1rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.student-pin {
		font-size: 0.875rem;
		color: #6b7280;
		font-family: 'JetBrains Mono', monospace;
		background: rgba(0, 0, 0, 0.05);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		display: inline-block;
	}

	.teacher-assignments {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.teacher-assignment {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(34, 197, 94, 0.08);
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
	}

	.teacher-name {
		font-weight: 500;
		color: #059669;
	}

	.remove-btn {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 4px;
		padding: 0.25rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
	}

	.remove-btn:hover {
		background: rgba(239, 68, 68, 0.2);
		transform: scale(1.1);
	}

	.remove-icon {
		color: #dc2626;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.no-assignments {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: 6px;
		padding: 0.75rem;
		color: #d97706;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.no-assign-icon {
		font-size: 1rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		background: rgba(0, 0, 0, 0.02);
		border-radius: 12px;
		border: 2px dashed rgba(0, 0, 0, 0.1);
		color: #6b7280;
		font-size: 1.1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.empty-icon {
		font-size: 3rem;
		opacity: 0.5;
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

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: 1.5rem;
			text-align: center;
		}

		.admin-title {
			font-size: 2rem;
		}

		.admin-content {
			padding: 1rem;
		}

		.admin-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.card-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.query-toolbar {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.results-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.unauthorized-content {
			margin: 1rem;
			padding: 2.5rem 2rem;
		}

		.unauthorized-content h2 {
			font-size: 1.75rem;
		}
	}

	@media (max-width: 480px) {
		.admin-title {
			font-size: 1.75rem;
		}

		.card-content {
			padding: 1.5rem;
		}

		.card-header {
			padding: 1.5rem;
		}

		.btn {
			padding: 0.75rem 1.25rem;
			font-size: 0.9rem;
		}

		.results-output {
			font-size: 0.8rem;
		}

		/* Assignment section mobile styles */
		.form-row {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.assignments-grid {
			grid-template-columns: 1fr;
		}

		.student-card {
			padding: 1rem;
		}

		.section-subtitle {
			font-size: 1.1rem;
		}
	}

	/* Focus states for accessibility */
	.btn:focus,
	.form-input:focus,
	.query-textarea:focus,
	.nav-link:focus {
		outline: 2px solid #1e3a8a;
		outline-offset: 2px;
	}

	/* Enhanced hover effects */
	.admin-card:hover .section-icon {
		transform: scale(1.1);
		transition: transform 0.3s ease;
	}

	.stat-item:hover .stat-icon {
		transform: scale(1.1);
		transition: transform 0.3s ease;
	}

	/* Loading animation for buttons */
	.btn:disabled .btn-icon {
		opacity: 0.5;
	}

	/* Smooth transitions for form elements */
	.form-input,
	.query-textarea {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Enhanced card animations */
	.admin-card {
		animation: fadeInUp 0.5s ease-out;
		animation-fill-mode: both;
	}

	.admin-card:nth-child(1) {
		animation-delay: 0.1s;
	}

	.admin-card:nth-child(2) {
		animation-delay: 0.2s;
	}

	.admin-card:nth-child(3) {
		animation-delay: 0.3s;
	}

	/* Custom scrollbar for results */
	.results-output::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	.results-output::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
	}

	.results-output::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.3);
		border-radius: 4px;
	}

	.results-output::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.5);
	}
</style>
