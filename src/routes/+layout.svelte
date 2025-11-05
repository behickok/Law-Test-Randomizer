<script>
	import { user } from '$lib/user';
	import { goto } from '$app/navigation';

	let { data, children } = $props();

	$effect(() => {
		user.set(data?.user ?? null);
	});

	async function logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch (error) {
			console.error('Failed to logout:', error);
		} finally {
			user.logout();
			goto('/login');
		}
	}
</script>

<header>
	<nav>
                <ul class="nav-left">
                        <li><a href="/" class="home-link">Home</a></li>
                        {#if $user?.role === 'teacher'}
                                <li><a href="/teacher/upload" class="workspace-link">Teacher workspace</a></li>
                        {/if}
                        <li><a href="/help" class="help-link">Help</a></li>
                </ul>
		<ul class="nav-right">
			{#if $user}
				<li>
					<span class="welcome-text"
						>Welcome, <strong>{$user.name}</strong> <span class="role">({$user.role})</span></span
					>
				</li>
				<li><button onclick={logout} class="logout-btn">Logout</button></li>
			{:else}
				<li><a href="/login" class="login-link">Login</a></li>
			{/if}
		</ul>
	</nav>
</header>

<main>{@render children?.()}</main>

<style>
	/* Global Reset */
	* {
		box-sizing: border-box;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
	}

	/* Header and Navigation */
	header {
		background: rgba(255, 255, 255, 0.98);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		position: sticky;
		top: 0;
		z-index: 1000;
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
		color: #374151;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.95rem;
		padding: 0.625rem 1.25rem;
		border-radius: 8px;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		letter-spacing: -0.01em;
	}

	a:hover {
		background: rgba(59, 130, 246, 0.08);
		color: #2563eb;
		transform: translateY(-1px);
	}

	.home-link {
		font-weight: 600;
		font-size: 1rem;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		border: none;
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.2);
	}

	.home-link:hover {
		background: linear-gradient(135deg, #1d4ed8, #1e40af);
		color: white;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
		transform: translateY(-2px);
	}

	.login-link {
		background: transparent;
		border: 1px solid #d1d5db;
		font-weight: 500;
		color: #6b7280;
	}

	.login-link:hover {
		background: rgba(59, 130, 246, 0.05);
		border-color: #2563eb;
		color: #2563eb;
	}

        .help-link {
                background: transparent;
                border: 1px solid #d1d5db;
                font-weight: 500;
                color: #6b7280;
        }

        .help-link:hover {
                background: rgba(16, 185, 129, 0.05);
                border-color: #059669;
                color: #059669;
        }

        .workspace-link {
                background: transparent;
                border: 1px solid rgba(37, 99, 235, 0.3);
                font-weight: 500;
                color: #2563eb;
        }

        .workspace-link:hover {
                background: rgba(37, 99, 235, 0.08);
                border-color: #1d4ed8;
                color: #1d4ed8;
        }

	/* Welcome Text */
	.welcome-text {
		color: #374151;
		font-size: 0.9rem;
		padding: 0.5rem 0;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.welcome-text strong {
		color: #1f2937;
		font-weight: 600;
	}

	.role {
		color: #6b7280;
		font-size: 0.8rem;
		font-weight: 500;
		background: rgba(59, 130, 246, 0.08);
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		border: 1px solid rgba(59, 130, 246, 0.12);
	}

	/* Logout Button */
	.logout-btn {
		background: transparent;
		color: #dc2626;
		border: 1px solid #fca5a5;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		letter-spacing: -0.01em;
	}

	.logout-btn:hover {
		background: rgba(239, 68, 68, 0.05);
		border-color: #dc2626;
		color: #b91c1c;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
	}

	.logout-btn:active {
		transform: translateY(0);
		box-shadow: 0 1px 3px rgba(220, 38, 38, 0.1);
	}

	/* Main Content */
	main {
		min-height: calc(100vh - 4rem);
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
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
