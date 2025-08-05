<script>
	import { onMount } from 'svelte';
	import { query, uploadSQL } from '$lib/api';
	import logo from '$lib/assets/favicon.svg';

	let tests = [];
	let error = '';
	let file;

	async function loadTests() {
		try {
			const res = await query('select id, title, description from tests');
			tests = Array.isArray(res) ? res : (res?.data ?? []);
		} catch (e) {
			error = 'Failed to load tests';
		}
	}

	onMount(loadTests);

	async function handleUpload() {
		if (!file) return;
		try {
			await uploadSQL(file);
			file = null;
			await loadTests();
		} catch (e) {
			error = 'Upload failed';
		}
	}
</script>

<main>
	<header class="brand">
		<img src={logo} alt="Law Test Randomizer logo" />
		<h1>Law Test Randomizer</h1>
	</header>

	<section class="upload">
		<h2>Upload Test (SQL)</h2>
		<input type="file" accept=".sql" on:change={(e) => (file = e.target.files[0])} />
		<button on:click|preventDefault={handleUpload}>Upload</button>
	</section>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<section class="tests">
		<h2>Available Tests</h2>
		{#if tests.length}
			<ul>
				{#each tests as t}
					<li><a href={`/tests/${t.id}`}>{t.title}</a></li>
				{/each}
			</ul>
		{:else}
			<p>No tests available.</p>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 60rem;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}

	.brand {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background-color: #0d3b66;
		color: #fff;
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
	}

	.brand img {
		width: 40px;
		height: 40px;
	}

	section {
		margin-top: 1.5rem;
	}

	button {
		background-color: #0d3b66;
		color: #fff;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	button:hover {
		background-color: #092745;
	}

	.error {
		color: #c00;
		margin-top: 1rem;
	}
</style>
