<script>
	import { user } from '$lib/user';
	import { goto } from '$app/navigation';

	function logout() {
		user.logout();
		goto('/login');
	}
</script>

<header>
	<nav>
		<ul class="nav-left">
			<li><a href="/" class="home-link">Home</a></li>
		</ul>
		<ul class="nav-right">
			{#if $user}
				<li>
					<span class="welcome-text"
						>Welcome, <strong>{$user.name}</strong> <span class="role">({$user.role})</span></span
					>
				</li>
				<li><button on:click={logout} class="logout-btn">Logout</button></li>
			{:else}
				<li><a href="/login" class="login-link">Login</a></li>
			{/if}
		</ul>
	</nav>
</header>

<main>
	<slot />
</main>

<style>
	/* Global Reset */
	* {
		box-sizing: border-box;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
	}

	/* Header and Navigation */
	header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
		position: sticky;
		top: 0;
		z-index: 1000;
		backdrop-filter: blur(10px);
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 2rem;
		max-width: 1200px;
		margin: 0 auto;
		height: 4rem;
	}

	/* Navigation Lists */
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.nav-left {
		flex: 1;
	}

	.nav-right {
		flex: 1;
		justify-content: flex-end;
	}

	/* Links */
	a {
		color: white;
		text-decoration: none;
		font-weight: 500;
		font-size: 1rem;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	a:hover {
		background: rgba(255, 255, 255, 0.15);
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.home-link {
		font-weight: 600;
		font-size: 1.1rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.login-link {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		font-weight: 600;
	}

	.login-link:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.4);
	}

	/* Welcome Text */
	.welcome-text {
		color: white;
		font-size: 0.95rem;
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.welcome-text strong {
		color: #f8fafc;
		font-weight: 600;
	}

	.role {
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.85rem;
		font-style: italic;
	}

	/* Logout Button */
	.logout-btn {
		background: linear-gradient(45deg, #ef4444, #dc2626);
		color: white;
		border: none;
		padding: 0.5rem 1.25rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.logout-btn:hover {
		background: linear-gradient(45deg, #dc2626, #b91c1c);
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
	}

	.logout-btn:active {
		transform: translateY(0);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* Main Content */
	main {
		min-height: calc(100vh - 4rem);
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 2rem;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		nav {
			padding: 0 1rem;
			flex-direction: column;
			height: auto;
			padding-top: 1rem;
			padding-bottom: 1rem;
			gap: 1rem;
		}

		.nav-left,
		.nav-right {
			flex: none;
		}

		ul {
			gap: 1rem;
		}

		.welcome-text {
			font-size: 0.85rem;
			text-align: center;
		}

		main {
			padding: 1rem;
		}
	}

	@media (max-width: 480px) {
		.nav-right {
			flex-direction: column;
			gap: 0.75rem;
		}

		.welcome-text {
			flex-direction: column;
			gap: 0.25rem;
		}

		a,
		.logout-btn {
			font-size: 0.85rem;
			padding: 0.4rem 0.8rem;
		}
	}

	/* Focus states for accessibility */
	a:focus,
	.logout-btn:focus {
		outline: 2px solid #667eea;
		outline-offset: 2px;
	}

	/* Subtle animations */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	header {
		animation: fadeIn 0.5s ease-out;
	}
</style>
