<script>
	import { user } from '$lib/user';
	import { goto } from '$app/navigation';

	function logout() {
		$user = null;
		goto('/login');
	}
</script>

<header>
	<nav>
		<ul>
			<li><a href="/">Home</a></li>
		</ul>
		<ul>
			{#if $user}
				<li><span>Welcome, {$user.name} ({$user.role})</span></li>
				<li><button on:click={logout}>Logout</button></li>
			{:else}
				<li><a href="/login">Login</a></li>
			{/if}
		</ul>
	</nav>
</header>

<main>
	<slot />
</main>

<style>
	nav {
		display: flex;
		justify-content: space-between;
	}
</style>
