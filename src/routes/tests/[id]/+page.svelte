<script>
	let { data } = $props();
	let test = data.test;
	let questions = data.questions ?? [];
	let student = '';
	let submitted = false;
	let score = 0;
	let error = data.error ?? '';

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
