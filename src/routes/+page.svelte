<script>
        import { onMount } from 'svelte';
        import { query, uploadSQL } from '$lib/api';

        let tests = [];
        let error = '';
        let file;

        async function loadTests() {
                try {
                        const res = await query('select id, title, description from tests');
                        tests = Array.isArray(res) ? res : res?.data ?? [];
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

<h1>Law Test Randomizer</h1>

<section>
        <h2>Upload Test (SQL)</h2>
        <input type="file" accept=".sql" on:change={(e) => (file = e.target.files[0])} />
        <button on:click|preventDefault={handleUpload}>Upload</button>
</section>

{#if error}
        <p class="error">{error}</p>
{/if}

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
