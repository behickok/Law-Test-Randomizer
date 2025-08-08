<script>
	import { user } from '$lib/user';
	import {
		uploadTestSpreadsheet,
		setTestActive,
		assignTest,
		getTeacherResults,
		getAttemptAnswers,
		getStudentResults,
		getClassStudents,
		requestClassJoin,
		getPendingStudents,
		approveStudent
	} from '$lib/api';
	import { onMount, $effect } from 'svelte';
	import { writable } from 'svelte/store';

	let { data } = $props();
	const tests = writable(data.tests ?? []);
	let error = data.error ?? '';

	let file;
	let title = '';
	let uploadMsg = '';

	async function handleUpload() {
		if (!$user || $user.role !== 'teacher') {
			uploadMsg = 'You must be logged in as a teacher to upload tests.';
			return;
		}
		const autoTitle = title.trim() || file?.name?.replace(/\.[^/.]+$/, '');
		try {
			await uploadTestSpreadsheet(fetch, { file, title: autoTitle, teacherId: $user.id });
			uploadMsg = 'Uploaded';
		} catch {
			uploadMsg = 'Upload failed';
		}
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

	let assignTestId = '';
	const students = writable([]);
	let selectedStudentId = '';
	let assignMsg = '';
	const pendingStudents = writable([]);

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

	async function loadPendingStudents() {
		if (!$user || $user.role !== 'teacher') {
			return;
		}
		try {
			const res = await getPendingStudents(fetch, $user.id);
			pendingStudents.set(Array.isArray(res) ? res : (res?.data ?? []));
		} catch {
			pendingStudents.set([]);
		}
	}

	onMount(() => {
		loadStudents();
		loadPendingStudents();
		if ($user?.role === 'teacher') {
			loadTeacherResults();
		}
		if ($user?.role === 'student') {
			loadStudentResults();
		}
	});

	// Reactive loading when user state changes
	$effect(() => {
		if ($user) {
			if ($user.role === 'teacher') {
				loadStudents();
				loadPendingStudents();
				loadTeacherResults();
			} else if ($user.role === 'student') {
				loadStudentResults();
			}
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

	let teacherPin = '';
	let joinMsg = '';

	async function handleJoin() {
		if (!$user || $user.role !== 'student') {
			joinMsg = 'You must be logged in as a student to join a class.';
			return;
		}
		try {
			await requestClassJoin(fetch, { studentId: $user.id, teacherPin });
			joinMsg = 'Request sent';
		} catch (e) {
			joinMsg = e.message;
		}
	}

	async function handleApprove(id) {
		if (!$user || $user.role !== 'teacher') {
			return;
		}
		try {
			await approveStudent(fetch, { teacherId: $user.id, studentId: id });
			pendingStudents.update((ps) => ps.filter((s) => s.id !== id));
			await loadStudents();
		} catch {
			/* empty */
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
						<!-- Upload Section -->
						<section class="card upload-card">
							<div class="card-header">
								<h2 class="card-title">
									<span class="section-icon">📤</span>
									Upload New Test
								</h2>
							</div>
							<div class="card-content">
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
									<label for="file-input">CSV File</label>
									<div class="file-input-wrapper">
										<input
											id="file-input"
											type="file"
											accept=".csv"
											on:change={(e) => {
												file = e.target.files[0];
												if (!title) {
													title = file?.name?.replace(/\.[^/.]+$/, '');
												}
											}}
											class="file-input"
										/>
										<span class="file-input-label">
											{file ? file.name : 'Choose CSV file...'}
										</span>
									</div>
								</div>
								<button on:click={handleUpload} class="btn btn-primary"> Upload Test </button>
								{#if uploadMsg}
									<div class="status-message {uploadMsg === 'Uploaded' ? 'success' : 'error'}">
										{uploadMsg}
									</div>
								{/if}
							</div>
						</section>

						<!-- Pending Students -->
						<section class="card pending-card">
							<div class="card-header">
								<h2 class="card-title">
									<span class="section-icon">⏳</span>
									Pending Requests
									{#if $pendingStudents.length}
										<span class="badge">{$pendingStudents.length}</span>
									{/if}
								</h2>
							</div>
							<div class="card-content">
								{#if $pendingStudents.length}
									<div class="student-requests">
										{#each $pendingStudents as s (s.id)}
											<div class="request-item">
												<span class="student-name">{s.name}</span>
												<button on:click={() => handleApprove(s.id)} class="btn btn-success btn-sm">
													Accept
												</button>
											</div>
										{/each}
									</div>
								{:else}
									<div class="empty-state">
										<span class="empty-icon">✨</span>
										<p>No pending requests</p>
									</div>
								{/if}
							</div>
						</section>
					</div>

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
											<button
												on:click={() => toggleActive(t)}
												class="btn {t.is_active ? 'btn-warning' : 'btn-success'} btn-sm"
											>
												{t.is_active ? 'Deactivate' : 'Activate'}
											</button>
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
										<select id="student-select" bind:value={selectedStudentId} class="form-select">
											<option value="">Choose a student...</option>
											{#each $students as s (s.id)}
												<option value={s.id}>{s.name}</option>
											{/each}
										</select>
									</div>
								</div>
								<button on:click={handleAssign} class="btn btn-primary"> Assign Test </button>
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
												on:click={(e) => {
													if (e.target.open) loadAttemptAnswers(r.id);
												}}
											>
												<div class="result-info">
													<span class="student-name">{r.student_name}</span>
													<span class="test-title">{r.title}</span>
												</div>
												<span class="score-badge">
													Score: {r.score}
												</span>
											</summary>
											<div class="result-content">
												{#if $attemptAnswers[r.id]?.length}
													<div class="answers-list">
														{#each $attemptAnswers[r.id] as a (a.question_text)}
															<div class="answer-item {a.is_correct ? 'correct' : 'incorrect'}">
																<div class="question-text">{a.question_text}</div>
																<div class="choice-text">
																	{a.choice_text}
																	<span class="result-icon">
																		{a.is_correct ? '✅' : '❌'}
																	</span>
																</div>
															</div>
														{/each}
													</div>
												{:else}
													<div class="empty-state">
														<p>No answers available</p>
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
			{/if}

			{#if $user.role === 'student'}
				<div class="dashboard student-dashboard">
					<div class="dashboard-grid">
						<!-- Join Class -->
						<section class="card join-card">
							<div class="card-header">
								<h2 class="card-title">
									<span class="section-icon">🏫</span>
									Join Teacher's Class
								</h2>
							</div>
							<div class="card-content">
								<div class="form-group">
									<label for="pin-input">Teacher PIN</label>
									<input
										id="pin-input"
										type="text"
										placeholder="Enter teacher's PIN..."
										bind:value={teacherPin}
										class="form-input"
									/>
								</div>
								<button on:click={handleJoin} class="btn btn-primary"> Join Class </button>
								{#if joinMsg}
									<div class="status-message {joinMsg === 'Request sent' ? 'success' : 'error'}">
										{joinMsg}
									</div>
								{/if}
							</div>
						</section>

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
											<div class="test-item {r.score == null ? 'pending' : 'completed'}">
												{#if r.score == null}
													<a href={`/tests/${r.test_id}`} class="test-link pending">
														<div class="test-info">
															<span class="test-title">{r.title}</span>
															<span class="test-status">Ready to take</span>
														</div>
														<span class="action-indicator">→</span>
													</a>
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
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		color: #333;
	}

	.main-header {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		padding: 1rem 0;
		position: sticky;
		top: 0;
		z-index: 100;
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
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: linear-gradient(135deg, #667eea, #764ba2);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.law-icon {
		font-size: 2rem;
	}

	.header-nav {
		display: flex;
		align-items: center;
	}

	.admin-link {
		padding: 0.5rem 1rem;
		background: rgba(102, 126, 234, 0.1);
		border: 1px solid rgba(102, 126, 234, 0.3);
		border-radius: 8px;
		color: #667eea;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.3s ease;
	}

	.admin-link:hover {
		background: rgba(102, 126, 234, 0.2);
		transform: translateY(-1px);
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
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
	}

	.card {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		transition:
			transform 0.3s ease,
			box-shadow 0.3s ease;
		animation: fadeInUp 0.5s ease-out;
	}

	.card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
	}

	.card-header {
		padding: 1.5rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
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

	.file-input-wrapper {
		position: relative;
		overflow: hidden;
		display: inline-block;
		width: 100%;
	}

	.file-input {
		position: absolute;
		left: -9999px;
	}

	.file-input-label {
		display: block;
		padding: 0.75rem 1rem;
		border: 2px dashed rgba(102, 126, 234, 0.3);
		border-radius: 12px;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
		background: rgba(102, 126, 234, 0.05);
		color: #667eea;
	}

	.file-input-label:hover {
		border-color: #667eea;
		background: rgba(102, 126, 234, 0.1);
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
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
	}

	.btn-success {
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
	}

	.btn-success:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
	}

	.btn-warning {
		background: linear-gradient(135deg, #f59e0b, #d97706);
		color: white;
	}

	.btn-warning:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
	}

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn-large {
		padding: 1rem 2rem;
		font-size: 1.125rem;
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
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		padding: 3rem;
		border-radius: 20px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		max-width: 500px;
		animation: fadeInUp 0.6s ease-out;
	}

	.welcome-content h2 {
		font-size: 2rem;
		margin-bottom: 1rem;
		background: linear-gradient(135deg, #667eea, #764ba2);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
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
