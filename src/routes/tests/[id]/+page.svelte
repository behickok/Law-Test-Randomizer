<script>
	import { onMount } from 'svelte';
	import { updateQuestion, updateChoice, submitAttempt } from '$lib/api';
	import { user } from '$lib/user';

	let { data } = $props();
	let test = data.test;
	let questions = $state(data.questions ?? []);
	let student = $state('');
	let submitted = $state(false);
	let score = $state(0);
	let error = $state(data.error ?? '');

	let isTeacherOwner = $state(false);
	let saveMessage = $state('');

	function shuffle(arr) {
		return arr.sort(() => Math.random() - 0.5);
	}

	onMount(() => {
		if ($user && $user.role === 'teacher' && $user.id === test.teacher_id) {
			isTeacherOwner = true;
		}

		questions = shuffle(
			questions.map((q) => ({
				...q,
				choices: shuffle([...q.choices])
			}))
		);
	});

	async function saveQuestion(q) {
		if (!isTeacherOwner) return;
		try {
			await updateQuestion(fetch, { questionId: q.id, text: q.text, teacherId: $user.id });
			for (const c of q.choices) {
				const isCorrect = q.correct == c.id;
				await updateChoice(fetch, {
					choiceId: c.id,
					text: c.text,
					isCorrect,
					teacherId: $user.id
				});
			}
			saveMessage = 'Saved';
		} catch {
			saveMessage = 'Save failed';
		}
	}

	async function submit() {
		const answers = [];
		score = 0;
		for (const q of questions) {
			const choice = q.choices.find((c) => c.id == q.selected);
			const correct = !!choice?.is_correct;
			if (correct) score++;
			answers.push({ questionId: q.id, choiceId: q.selected, isCorrect: correct });
		}
		submitted = true;
		try {
			await submitAttempt(fetch, {
				testId: test.id,
				studentId: $user.id,
				studentName: student || $user.name,
				answers,
				score
			});
		} catch {
			// ignore save error for now
		}
	}
</script>

<main class="container">
	{#if error}
		<p>{error}</p>
	{:else if !test}
		<p>Loading...</p>
	{:else}
		<h1>{test.title}</h1>

		{#if $user}
			{#if isTeacherOwner}
				<h2>Manage Questions</h2>
				{#each questions as q (q.id)}
					<div class="question">
						<input bind:value={q.text} />
						{#each q.choices as c (c.id)}
							<div class="choice">
								<input type="radio" name={`correct-${q.id}`} value={c.id} bind:group={q.correct} />
								<input bind:value={c.text} />
							</div>
						{/each}
						<button type="button" onclick={() => saveQuestion(q)}>Save</button>
					</div>
				{/each}
				{#if saveMessage}
					<p class="message">{saveMessage}</p>
				{/if}
			{:else if $user.role === 'student'}
				{#if !submitted}
					<div class="meta">
						<label>
							Name:
							<input bind:value={student} />
						</label>
					</div>
					{#each questions as q, i (q.id)}
						<div class="question">
							<p>
								{i + 1}. {q.text}
							</p>
							{#each q.choices as c (c.id)}
								<label>
									<input
										type="radio"
										name={`q${q.id}`}
										value={c.id}
										onchange={() => (q.selected = c.id)}
									/>
									{c.text}
								</label>
							{/each}
						</div>
					{/each}
					<button type="button" onclick={submit}>Submit</button>
				{:else}
					<p>Score: {score} / {questions.length}</p>
				{/if}
			{:else}
				<p>You do not have permission to view this test in this mode.</p>
			{/if}
		{:else}
			<p>Please <a href="/login">log in</a> to take or manage this test.</p>
		{/if}
	{/if}
</main>
