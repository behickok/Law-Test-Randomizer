<script>
        import { onMount } from 'svelte';
        import { query, updateQuestion, updateChoice } from '$lib/api';

        let { data } = $props();
        let test = data.test;
        let questions = data.questions ?? [];
        let student = '';
        let submitted = false;
        let score = 0;
        let error = data.error ?? '';

        let teacherPin = '';
        let teacherError = '';
        let isTeacher = false;

        function shuffle(arr) {
                return arr.sort(() => Math.random() - 0.5);
        }

        onMount(() => {
                questions = shuffle(
                        questions.map((q) => ({
                                ...q,
                                choices: shuffle([...q.choices])
                        }))
                );
        });

        async function verifyTeacher() {
                try {
                        const res = await query(fetch, `SELECT 1 FROM tests WHERE id = ${test.id} AND teacher_pin = '${teacherPin}'`);
                        const rows = Array.isArray(res) ? res : res?.data ?? [];
                        if (rows.length) {
                                isTeacher = true;
                                teacherError = '';
                        } else {
                                teacherError = 'Invalid PIN';
                        }
                } catch {
                        teacherError = 'Verification failed';
                }
        }

        async function saveQuestion(q) {
                try {
                        await updateQuestion(fetch, { questionId: q.id, text: q.text, teacherPin });
                        for (const c of q.choices) {
                                const isCorrect = q.correct == c.id;
                                await updateChoice(fetch, {
                                        choiceId: c.id,
                                        text: c.text,
                                        isCorrect,
                                        teacherPin
                                });
                        }
                        teacherError = 'Saved';
                } catch {
                        teacherError = 'Save failed';
                }
        }

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
        {#if isTeacher}
                <h2>Manage Questions</h2>
                {#each questions as q (q.id)}
                        <div class="question">
                                <input bind:value={q.text} />
                                {#each q.choices as c (c.id)}
                                        <div class="choice">
                                                <input
                                                        type="radio"
                                                        name={`correct-${q.id}`}
                                                        value={c.id}
                                                        bind:group={q.correct}
                                                />
                                                <input bind:value={c.text} />
                                        </div>
                                {/each}
                                <button on:click={() => saveQuestion(q)}>Save</button>
                        </div>
                {/each}
                {#if teacherError}<p class="error">{teacherError}</p>{/if}
        {:else}
                <div class="teacher-login">
                        <input type="password" placeholder="Teacher PIN" bind:value={teacherPin} />
                        <button on:click={verifyTeacher}>Manage</button>
                        {#if teacherError}<p class="error">{teacherError}</p>{/if}
                </div>
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
{/if}
