<script>
	import { user } from '$lib/user';
	import {
		uploadTestSpreadsheet,
		setTestActive,
		assignTest,
		getTeacherResults,
		getStudentResults,
		query
	} from '$lib/api';

	let { data } = $props();
	let tests = data.tests;
	let error = data.error ?? '';

	let file;
	let title = '';
	let uploadMsg = '';

	async function handleUpload() {
		if (!$user || $user.role !== 'teacher') {
			uploadMsg = 'You must be logged in as a teacher to upload tests.';
			return;
		}
		try {
			await uploadTestSpreadsheet(fetch, { file, title, teacherId: $user.id });
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
			t.is_active = !t.is_active;
		} catch {
			error = 'Failed to update test';
		}
	}

	let assignTestId = '';
	let studentName = '';
	let assignMsg = '';

	async function handleAssign() {
		if (!$user || $user.role !== 'teacher') {
			assignMsg = 'You must be logged in as a teacher to assign tests.';
			return;
		}
		const students = await query(fetch, `SELECT id FROM students WHERE name = '${studentName}'`);
		if (students.length === 0) {
			assignMsg = 'Student not found';
			return;
		}
		const studentId = students[0].id;

		try {
			await assignTest(fetch, { testId: assignTestId, studentId, studentName });
			assignMsg = 'Assigned';
		} catch (e) {
			assignMsg = e.message;
		}
	}

	let teacherResults = [];

	async function loadTeacherResults() {
		if (!$user || $user.role !== 'teacher') {
			return;
		}
		try {
			const res = await getTeacherResults(fetch, $user.id);
			teacherResults = Array.isArray(res) ? res : res?.data ?? [];
		} catch {
			teacherResults = [];
		}
	}

	let studentResults = [];

	async function loadStudentResults() {
		if (!$user || $user.role !== 'student') {
			return;
		}
		try {
			const res = await getStudentResults(fetch, $user.id);
			studentResults = Array.isArray(res) ? res : res?.data ?? [];
		} catch {
			studentResults = [];
		}
	}
</script>

<main class="container">
	<header class="brand">
		<h1>Law Test Randomizer</h1>
	</header>
	<nav class="admin-link"><a href="/admin">Admin</a></nav>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if $user}
		{#if $user.role === 'teacher'}
			<section class="upload">
				<h2>Upload Test (Spreadsheet)</h2>
				<input type="text" placeholder="Title" bind:value={title} />
				<input type="file" accept=".csv" on:change={(e) => (file = e.target.files[0])} />
				<button on:click={handleUpload}>Upload</button>
				{#if uploadMsg}
					<p>{uploadMsg}</p>
				{/if}
			</section>

			<section class="tests">
				<h2>Manage Tests</h2>
				{#if tests.length}
					<ul>
						{#each tests as t (t.id)}
							<li>
								<a href={`/tests/${t.id}`}>{t.title}</a>
								<span>({t.is_active ? 'Active' : 'Inactive'})</span>
								<button on:click={() => toggleActive(t)}>
									{t.is_active ? 'Deactivate' : 'Activate'}
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p>No tests available.</p>
				{/if}
			</section>

			<section class="assign">
				<h2>Assign Test to Student</h2>
				<select bind:value={assignTestId}>
					<option value="">Select test</option>
					{#each tests as t}
						<option value={t.id}>{t.title}</option>
					{/each}
				</select>
				<input type="text" placeholder="Student name" bind:value={studentName} />
				<button on:click={handleAssign}>Assign</button>
				{#if assignMsg}
					<p>{assignMsg}</p>
				{/if}
			</section>

			<section class="teacher-results">
				<h2>Review Test Responses</h2>
				<button on:click={loadTeacherResults}>Load Results</button>
				{#if teacherResults.length}
					<ul>
						{#each teacherResults as r}
							<li>{r.student_name}: {r.score} ({r.title})</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if $user.role === 'student'}
			<section class="student-results">
				<h2>My Results</h2>
				<button on:click={loadStudentResults}>Load</button>
				{#if studentResults.length}
					<ul>
						{#each studentResults as r}
							<li>{r.title}: {r.score}</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	{:else}
		<p>Please <a href="/login">log in</a> to use the application.</p>
	{/if}
</main>

<style>
	.brand {
		text-align: center;
		margin-bottom: 2rem;
	}
	.admin-link {
		text-align: right;
	}
</style>
