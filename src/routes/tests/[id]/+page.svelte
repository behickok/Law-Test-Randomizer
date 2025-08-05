<script>
	import { query } from '$lib/api';
	import { SvelteMap } from 'svelte';

	let { params } = $props();
	let test;
	let questions = [];
	let student = '';
	let submitted = false;
	let score = 0;
	let error = '';

	function shuffle(arr) {
		return arr.sort(() => Math.random() - 0.5);
	}

	async function load() {
		try {
			const tRes = await query(`select id, title from tests where id = ${params.id}`);
			const tData = Array.isArray(tRes) ? tRes : (tRes?.data ?? []);
			test = tData[0];

			const qRes = await query(`
                                select q.id as question_id, q.question_text, c.id as choice_id, c.choice_text, c.is_correct
                                from questions q join choices c on q.id = c.question_id
                                where q.test_id = ${params.id}
                        `);
			const rows = Array.isArray(qRes) ? qRes : (qRes?.data ?? []);
			const map = new SvelteMap();
			for (const r of rows) {
				if (!map.has(r.question_id)) {
					map.set(r.question_id, {
						id: r.question_id,
						text: r.question_text,
						choices: []
					});
				}
				map.get(r.question_id).choices.push({
					id: r.choice_id,
					text: r.choice_text,
					is_correct: r.is_correct
				});
			}
			questions = shuffle(
				Array.from(map.values()).map((q) => ({
					...q,
					choices: shuffle(q.choices),
					selected: null
				}))
			);
		} catch {
			error = 'Failed to load test';
		}
	}

	load();

	function submit() {
		score = 0;
		for (const q of questions) {
			const choice = q.choices.find((c) => c.id == q.selected);
			if (choice?.is_correct) score++;
		}
		submitted = true;
	}
</script>

{#if error}
	<p>{error}</p>
{:else if !test}
	<p>Loading...</p>
{:else}
	<h1>{test.title}</h1>
	{#if !submitted}
		<div class="meta">
			<label>
				Name:
				<input bind:value={student} />
			</label>
		</div>
		{#each questions as q, i (q.id)}
			<div class="question">
				<p>{i + 1}. {q.text}</p>
				{#each q.choices as c (c.id)}
					<label>
						<input
							type="radio"
							name={`q${q.id}`}
							value={c.id}
							on:change={() => (q.selected = c.id)}
						/>
						{c.text}
					</label>
				{/each}
			</div>
		{/each}
		<button on:click={submit}>Submit</button>
	{:else}
		<p>Score: {score} / {questions.length}</p>
	{/if}
{/if}
