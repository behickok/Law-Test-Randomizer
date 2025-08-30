<script>
	import { onMount } from 'svelte';
	import { updateQuestion, updateChoice, submitAttempt } from '$lib/api';
	import { user } from '$lib/user';

	let { data } = $props();
	let test = data.test;
	let questions = $state(data.questions ?? []);
	let submitted = $state(false);
	let score = $state(0);
	let totalPoints = $state(questions.reduce((s, q) => s + (q.points ?? 1), 0));
	let error = $state(data.error ?? '');
	let submitError = $state('');

	let isTeacherOwner = $state(false);
	let saveMessage = $state('');

	function shuffle(arr) {
		return arr.sort(() => Math.random() - 0.5);
	}

	onMount(() => {
		if ($user && $user.role === 'teacher' && $user.id === test.teacher_id) {
			isTeacherOwner = true;
		}

		// Only randomize questions for students, keep in order for teachers
		if ($user && $user.role === 'student') {
			questions = shuffle([...questions]);
		}
	});

	async function saveQuestion(q) {
		if (!isTeacherOwner) return;
		try {
			await updateQuestion(fetch, {
				questionId: q.id,
				text: q.text,
				teacherId: $user.id,
				points: q.points
			});
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
		let autoScore = 0;
		let hasLong = false;
		totalPoints = questions.reduce((s, q) => s + (q.points ?? 1), 0);
		for (const q of questions) {
			if (!q.choices.length) {
				hasLong = true;
				answers.push({ questionId: q.id, answerText: q.response });
				continue;
			}
			const choice = q.choices.find((c) => c.id == q.selected);
			const correct = !!choice?.is_correct;
			if (correct) autoScore += q.points;
			answers.push({
				questionId: q.id,
				choiceId: q.selected,
				isCorrect: correct,
				points: q.points
			});
		}
		score = hasLong ? null : autoScore;
		submitted = true;
		try {
			await submitAttempt(fetch, {
				testId: test.id,
				studentId: $user.id,
				studentName: $user.name,
				answers
			});
			submitError = '';
		} catch (err) {
			console.error('Submission error:', err);
			submitError = `Submission failed: ${err.message}. Please try again or contact your teacher.`;
			// Don't prevent the UI from showing submitted state, but show the error
		}
	}
</script>

<main class="container">
	{#if error}
		<p class="info-message">{error}</p>
	{:else if !test}
		<p class="info-message">Loading...</p>
	{:else}
		<h1>{test.title}</h1>

		{#if $user}
			{#if isTeacherOwner}
				<h2>Manage Questions</h2>
				{#each questions as q (q.id)}
					<div class="question">
						<div class="question-input-section">
							<label>Question Text (use {{ image_name }} for images):</label>
							<textarea bind:value={q.text} rows="3" class="question-textarea"></textarea>
							{#if q.processed_question_text && q.processed_question_text !== q.text}
								<div class="question-preview">
									<label>Preview:</label>
									<div class="preview-content">{@html q.processed_question_text}</div>
								</div>
							{/if}
						</div>
						<input type="number" min="0" bind:value={q.points} class="points-input" />
						{#each q.choices as c, choiceIndex (c.id)}
							<div class="choice">
								<input type="radio" name={`correct-${q.id}`} value={c.id} bind:group={q.correct} />
								<span class="choice-label">{String.fromCharCode(97 + choiceIndex)}.</span>
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
					<div class="test-header">
						<p class="student-info">Taking test as: <strong>{$user.name}</strong></p>
					</div>
					{#each questions as q, i (q.id)}
						<div class="question">
							<div class="question-text">
								{i + 1}. {@html q.processed_question_text || q.text}
							</div>
							{#if q.choices.length}
								{#each q.choices as c, choiceIndex (c.id)}
									<label>
										<input
											type="radio"
											name={`q${q.id}`}
											value={c.id}
											onchange={() => (q.selected = c.id)}
										/>
										<span class="choice-label">{String.fromCharCode(97 + choiceIndex)}.</span>
										{c.text}
									</label>
								{/each}
							{:else}
								<textarea bind:value={q.response} placeholder="Your answer here..."></textarea>
							{/if}
						</div>
					{/each}
					<button type="button" onclick={submit}>Submit</button>
				{:else}
					<div class="score-display">
						<p>🎉 Test Complete!</p>
						{#if score === null}
							<p>Score pending teacher review.</p>
						{:else}
							<p>Score: {score} / {totalPoints}</p>
							<p class="percentage">{Math.round((score / totalPoints) * 100)}%</p>
						{/if}
						{#if submitError}
							<div class="error-message">
								⚠️ {submitError}
							</div>
						{/if}
					</div>
				{/if}
			{:else}
				<p class="info-message">You do not have permission to view this test in this mode.</p>
			{/if}
		{:else}
			<p class="info-message">Please <a href="/login">log in</a> to take or manage this test.</p>
		{/if}
	{/if}
</main>

<style>
	* {
		box-sizing: border-box;
	}

	.container {
		min-height: 100vh;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		padding: 2rem;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
	}

	h1 {
		font-size: 2.25rem;
		font-weight: 800;
		color: #111827;
		margin-bottom: 2rem;
		text-align: center;
		letter-spacing: -0.025em;
	}

	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #374151;
		margin-bottom: 1.5rem;
	}

	.test-header {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.student-info {
		margin: 0;
		font-size: 1.1rem;
		color: #374151;
		text-align: center;
	}

	.student-info strong {
		color: #2563eb;
		font-weight: 600;
	}

	.question {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition: border-color 0.2s ease;
	}

	.question:hover {
		border-color: #d1d5db;
	}

	.question p {
		font-size: 1.1rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 1rem 0;
		line-height: 1.6;
	}

	.question label {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		margin-bottom: 0.5rem;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		font-size: 1rem;
		line-height: 1.5;
		color: #374151;
	}

	.question label:hover {
		background: rgba(59, 130, 246, 0.05);
	}

	.question input[type='radio'] {
		margin: 0;
		width: 1rem;
		height: 1rem;
		accent-color: #2563eb;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.question input[type='radio']:checked + label {
		background: rgba(37, 99, 235, 0.1);
		border-color: #2563eb;
	}

	button {
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		border: none;
		padding: 0.875rem 2rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
		letter-spacing: -0.01em;
	}

	button:hover {
		background: linear-gradient(135deg, #1d4ed8, #1e40af);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
	}

	button:active {
		transform: translateY(0);
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
	}

	.message {
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		color: #047857;
		padding: 1rem;
		border-radius: 8px;
		font-weight: 500;
		margin: 1rem 0;
	}

	/* Score display */
	.score-display {
		background: #ffffff;
		border: 2px solid #10b981;
		border-radius: 12px;
		padding: 2rem;
		margin-top: 2rem;
		text-align: center;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
	}

	.score-display p {
		margin: 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #047857;
	}

	.score-display p:first-child {
		font-size: 1.5rem;
		font-weight: 700;
		color: #059669;
		margin-bottom: 1rem;
	}

	.score-display .percentage {
		font-size: 3rem;
		font-weight: 900;
		color: #10b981;
		margin-top: 1rem;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #dc2626;
		padding: 1rem;
		border-radius: 8px;
		margin-top: 1rem;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	/* Question input and preview styles */
	.question-input-section {
		margin-bottom: 1rem;
	}

	.question-input-section label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
		font-size: 0.875rem;
	}

	.question-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		font-size: 1rem;
		font-family: inherit;
		resize: vertical;
		transition: border-color 0.2s ease;
	}

	.question-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.question-preview {
		margin-top: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
	}

	.question-preview label {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.preview-content {
		background: white;
		padding: 0.75rem;
		border-radius: 4px;
		border: 1px solid #e5e7eb;
	}

	.question-text {
		font-size: 1.1rem;
		line-height: 1.6;
		color: #374151;
		margin-bottom: 1rem;
	}

	/* Image styles in questions */
	.question-text :global(.question-image) {
		max-width: 100%;
		max-height: 300px;
		border-radius: 6px;
		margin: 0.75rem 0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		display: block;
	}

	.preview-content :global(.question-image) {
		max-height: 200px;
	}

	/* Teacher interface styles */
	.question input[type='text'] {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s ease;
		margin-bottom: 0.75rem;
	}

	.question input[type='text']:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.choice {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.choice input[type='radio'] {
		flex-shrink: 0;
	}

	.choice input[type='text'] {
		flex: 1;
		margin-bottom: 0;
	}

	.choice-label {
		font-weight: 600;
		color: #374151;
		margin-right: 0.5rem;
		min-width: 1.5rem;
		display: inline-block;
	}

	.points-input {
		width: 4rem;
		margin-left: 0.5rem;
	}

	/* Submit button centering */
	button[onclick*='submit'] {
		display: block;
		margin: 2rem auto 0;
		min-width: 200px;
	}

	/* Error and loading states */
	.info-message {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		color: #6b7280;
		font-size: 1.1rem;
		margin: 2rem auto;
		max-width: 500px;
	}

	.info-message a {
		color: #2563eb;
		text-decoration: none;
		font-weight: 600;
	}

	.info-message a:hover {
		text-decoration: underline;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}

		h1 {
			font-size: 1.875rem;
		}

		.question {
			padding: 1rem;
		}

		.question label {
			padding: 0.5rem 0.75rem;
		}

		button {
			width: 100%;
		}
	}

	/* Accessibility improvements */
	button:focus-visible {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}

	.question input[type='radio']:focus {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}
</style>
