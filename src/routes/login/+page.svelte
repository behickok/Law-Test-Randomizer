<script>
	import { goto } from '$app/navigation';
	import { user } from '$lib/user';
	import { query } from '$lib/api';
	import { PUBLIC_PASSPHRASE } from '$env/static/public';

	let pin = '';
	let error = '';
	let isLoading = false;

	async function login() {
		error = '';
		isLoading = true;

		if (!/^\d+$/.test(pin)) {
			error = 'PIN must be numeric';
			isLoading = false;
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
		} finally {
			isLoading = false;
		}
	}

	function handleInputChange() {
		if (error) {
			error = '';
		}
	}
</script>

<main class="container">
	<div class="login-card">
		<div class="card-header">
			<div class="icon-wrapper">
				<svg class="lock-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M16 12V8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8V12M8 12H16M8 12C6.89543 12 6 12.8954 6 14V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V14C18 12.8954 17.1046 12 16 12Z"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</div>
			<h1>Welcome Back</h1>
			<p class="subtitle">Enter your PIN to access your account</p>
		</div>

		<form on:submit|preventDefault={login} class="login-form">
			<div class="input-group">
				<label for="pin-input">PIN</label>
				<div class="input-wrapper">
					<input
						id="pin-input"
						type="password"
						bind:value={pin}
						on:input={handleInputChange}
						placeholder="Enter your PIN"
						class:error
						disabled={isLoading}
						autocomplete="off"
						maxlength="10"
					/>
					<div class="input-underline"></div>
				</div>
			</div>

			{#if error}
				<div class="error-message" role="alert">
					<svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
					{error}
				</div>
			{/if}

			<button type="submit" class="login-button" disabled={isLoading || !pin.trim()}>
				{#if isLoading}
					<svg class="loading-spinner" viewBox="0 0 24 24">
						<circle
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
							fill="none"
							opacity="0.25"
						/>
						<path
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							fill="currentColor"
						/>
					</svg>
					Logging in...
				{:else}
					Login
				{/if}
			</button>
		</form>

		<div class="card-footer">
			<p class="help-text">Need help? Contact your administrator</p>
		</div>
	</div>
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

	/* Container and Layout */
	.container {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		position: relative;
		overflow: hidden;
	}

	.container::before {
		content: '';
		position: absolute;
		top: -50%;
		right: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
		background-size: 30px 30px;
		animation: float 20s infinite linear;
		pointer-events: none;
	}

	@keyframes float {
		0% {
			transform: rotate(0deg) translate(-50%, -50%);
		}
		100% {
			transform: rotate(360deg) translate(-50%, -50%);
		}
	}

	/* Login Card */
	.login-card {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		border-radius: 1.5rem;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.25),
			0 0 0 1px rgba(255, 255, 255, 0.5);
		width: 100%;
		max-width: 420px;
		overflow: hidden;
		position: relative;
		z-index: 1;
		animation: slideUp 0.6s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Card Header */
	.card-header {
		padding: 3rem 2.5rem 2rem;
		text-align: center;
		background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
	}

	.icon-wrapper {
		display: inline-flex;
		padding: 1rem;
		background: linear-gradient(135deg, #667eea, #764ba2);
		border-radius: 50%;
		margin-bottom: 1.5rem;
		box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
	}

	.lock-icon {
		width: 2rem;
		height: 2rem;
		color: white;
	}

	h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
		background: linear-gradient(135deg, #667eea, #764ba2);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		color: #6b7280;
		font-size: 1rem;
		margin: 0;
		font-weight: 400;
	}

	/* Form Styling */
	.login-form {
		padding: 0 2.5rem 2rem;
	}

	.input-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
		font-size: 0.95rem;
	}

	.input-wrapper {
		position: relative;
	}

	input {
		width: 100%;
		padding: 1rem 0;
		border: none;
		background: transparent;
		font-size: 1.1rem;
		color: #1f2937;
		font-weight: 500;
		outline: none;
		transition: all 0.3s ease;
		border-bottom: 2px solid #e5e7eb;
	}

	input::placeholder {
		color: #9ca3af;
		font-weight: 400;
	}

	input:focus,
	input:not(:placeholder-shown) {
		border-bottom-color: transparent;
	}

	input.error {
		border-bottom-color: #ef4444;
	}

	.input-underline {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 2px;
		width: 0;
		background: linear-gradient(135deg, #667eea, #764ba2);
		transition: width 0.3s ease;
	}

	input:focus + .input-underline,
	input:not(:placeholder-shown) + .input-underline {
		width: 100%;
	}

	input.error + .input-underline {
		background: #ef4444;
		width: 100%;
	}

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #ef4444;
		font-size: 0.9rem;
		font-weight: 500;
		margin-bottom: 1.5rem;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border-radius: 0.5rem;
		border: 1px solid rgba(239, 68, 68, 0.2);
		animation: shake 0.5s ease-in-out;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-5px);
		}
		75% {
			transform: translateX(5px);
		}
	}

	.error-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	/* Login Button */
	.login-button {
		width: 100%;
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 14px rgba(102, 126, 234, 0.3);
		position: relative;
		overflow: hidden;
	}

	.login-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}

	.login-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
	}

	.login-button:hover:not(:disabled)::before {
		left: 100%;
	}

	.login-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.login-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	.loading-spinner {
		width: 1.25rem;
		height: 1.25rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Card Footer */
	.card-footer {
		padding: 1.5rem 2.5rem;
		background: rgba(249, 250, 251, 0.5);
		border-top: 1px solid rgba(229, 231, 235, 0.5);
		text-align: center;
	}

	.help-text {
		color: #6b7280;
		font-size: 0.85rem;
		margin: 0;
	}

	/* Responsive Design */
	@media (max-width: 480px) {
		.container {
			padding: 1rem;
		}

		.login-card {
			border-radius: 1rem;
		}

		.card-header {
			padding: 2rem 1.5rem 1.5rem;
		}

		.login-form {
			padding: 0 1.5rem 1.5rem;
		}

		.card-footer {
			padding: 1rem 1.5rem;
		}

		h1 {
			font-size: 1.75rem;
		}

		.icon-wrapper {
			padding: 0.75rem;
		}

		.lock-icon {
			width: 1.5rem;
			height: 1.5rem;
		}
	}

	/* Focus styles for accessibility */
	.login-button:focus-visible {
		outline: 2px solid #667eea;
		outline-offset: 2px;
	}

	input:focus {
		outline: none;
	}
</style>
