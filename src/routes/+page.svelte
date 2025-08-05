<script>
        import logo from '$lib/assets/favicon.svg';
        import {
                uploadTestSpreadsheet,
                setTestActive,
                assignTest,
                getTeacherResults,
                getStudentResults
        } from '$lib/api';

        let { data, form } = $props();
        let tests = data.tests;
        let error = data.error ?? '';

        let file;
        let title = '';
        let uploadPin = '';
        let uploadMsg = '';

        async function handleUpload() {
                try {
                        await uploadTestSpreadsheet(fetch, { file, title, teacherPin: uploadPin });
                        uploadMsg = 'Uploaded';
                } catch {
                        uploadMsg = 'Upload failed';
                }
        }

        let managePin = '';

        async function toggleActive(t) {
                try {
                        await setTestActive(fetch, {
                                testId: t.id,
                                teacherPin: managePin,
                                isActive: !t.is_active
                        });
                        t.is_active = !t.is_active;
                } catch {
                        error = 'Failed to update test';
                }
        }

        let assignTestId = '';
        let studentName = '';
        let studentPin = '';
        let assignMsg = '';

        async function handleAssign() {
                try {
                        await assignTest(fetch, { testId: assignTestId, studentName, studentPin });
                        assignMsg = 'Assigned';
                } catch {
                        assignMsg = 'Assignment failed';
                }
        }

        let resultsPin = '';
        let teacherResults = [];

        async function loadTeacherResults() {
                try {
                        const res = await getTeacherResults(fetch, resultsPin);
                        teacherResults = Array.isArray(res) ? res : res?.data ?? [];
                } catch {
                        teacherResults = [];
                }
        }

        let studentResultsPin = '';
        let studentResults = [];

        async function loadStudentResults() {
                try {
                        const res = await getStudentResults(fetch, studentResultsPin);
                        studentResults = Array.isArray(res) ? res : res?.data ?? [];
                } catch {
                        studentResults = [];
                }
        }
</script>

<main>
        <header class="brand">
                <img src={logo} alt="Law Test Randomizer logo" />
                <h1>Law Test Randomizer</h1>
        </header>
        <nav class="admin-link"><a href="/admin">Admin</a></nav>

        {#if error}
                <p class="error">{error}</p>
        {/if}

        <section class="upload">
                <h2>Upload Test (Spreadsheet)</h2>
                <input type="text" placeholder="Title" bind:value={title} />
                <input type="password" placeholder="Teacher PIN" bind:value={uploadPin} />
                <input type="file" accept=".csv" on:change={(e) => (file = e.target.files[0])} />
                <button on:click={handleUpload}>Upload</button>
                {#if uploadMsg}<p>{uploadMsg}</p>{/if}
        </section>

        <section class="tests">
                <h2>Manage Tests</h2>
                <input type="password" placeholder="Teacher PIN" bind:value={managePin} />
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
                <input type="text" placeholder="Student PIN" bind:value={studentPin} />
                <button on:click={handleAssign}>Assign</button>
                {#if assignMsg}<p>{assignMsg}</p>{/if}
        </section>

        <section class="teacher-results">
                <h2>Review Test Responses</h2>
                <input type="password" placeholder="Teacher PIN" bind:value={resultsPin} />
                <button on:click={loadTeacherResults}>Load Results</button>
                {#if teacherResults.length}
                        <ul>
                                {#each teacherResults as r}
                                        <li>{r.student_name}: {r.score} ({r.title})</li>
                                {/each}
                        </ul>
                {/if}
        </section>

        <section class="student-results">
                <h2>Student Results</h2>
                <input type="text" placeholder="Student PIN" bind:value={studentResultsPin} />
                <button on:click={loadStudentResults}>Load</button>
                {#if studentResults.length}
                        <ul>
                                {#each studentResults as r}
                                        <li>{r.title}: {r.score}</li>
                                {/each}
                        </ul>
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

        .admin-link {
                text-align: right;
        }

        .admin-link a {
                color: #0d3b66;
                text-decoration: none;
        }
</style>
