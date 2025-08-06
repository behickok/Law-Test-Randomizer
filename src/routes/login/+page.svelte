<script>
        import { goto } from '$app/navigation';
        import { user } from '$lib/user';
        import { query } from '$lib/api';
        import { PUBLIC_PASSPHRASE } from '$env/static/public';

	let pin = '';
	let error = '';

async function login() {
        error = '';
        if (!/^\d+$/.test(pin)) {
                error = 'PIN must be numeric';
                return;
        }

        try {
                const authedFetch = (input, init = {}) => {
                        init.headers = {
                                ...(init.headers || {}),
                                Authorization: `Bearer ${PUBLIC_PASSPHRASE}`
                        };
                        return fetch(input, init);
                };
                const teacher = await query(
                        authedFetch,
                        `SELECT id, name, 'teacher' as role FROM teachers WHERE pin = '${pin}'`
                );
                if (teacher.length > 0) {
                        $user = teacher[0];
                        goto('/');
                        return;
                }

                const student = await query(
                        authedFetch,
                        `SELECT id, name, 'student' as role FROM students WHERE pin = '${pin}'`
                );
                if (student.length > 0) {
                        $user = student[0];
                        goto('/');
                        return;
                }

                error = 'Invalid PIN';
        } catch (e) {
                error = e.message;
        }
}
</script>

<main class="container">
	<h1>Login</h1>

	<form on:submit|preventDefault={login}>
		<label>
			PIN
			<input type="password" bind:value={pin} />
		</label>
		<button type="submit">Login</button>
		{#if error}
			<p class="error">{error}</p>
		{/if}
	</form>
</main>
