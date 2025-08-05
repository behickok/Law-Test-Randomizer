<script>
	import { user } from '$lib/user';
	import { addTeacher, addStudent } from '$lib/api';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

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
			await addStudent(fetch, { name: studentName, pin: studentPin });
			studentMsg = 'Student added';
		} catch {
			studentMsg = 'Failed to add student';
		}
	}

	onMount(() => {
		if (!$user || $user.role !== 'teacher') {
			goto('/');
		}
	});
</script>

<main class="container">
	<h1>Admin</h1>
	{#if $user && $user.role === 'teacher'}
		<section>
			<h2>Add Teacher</h2>
			<input type="text" placeholder="Name" bind:value={teacherName} />
			<input type="text" placeholder="PIN" bind:value={teacherPin} />
			<button on:click={handleAddTeacher}>Add Teacher</button>
			{#if teacherMsg}
				<p>{teacherMsg}</p>
			{/if}
		</section>
		<section>
			<h2>Add Student</h2>
			<input type="text" placeholder="Name" bind:value={studentName} />
			<input type="text" placeholder="PIN" bind:value={studentPin} />
			<button on:click={handleAddStudent}>Add Student</button>
			{#if studentMsg}
				<p>{studentMsg}</p>
			{/if}
		</section>
	{:else}
		<p>You do not have permission to view this page.</p>
	{/if}
</main>
