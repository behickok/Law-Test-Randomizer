<script>
	import { goto } from '$app/navigation';
	import { user } from '$lib/user';
	import { query, signupTeacher, signupStudent, signupReviewer } from '$lib/api';
	import { PUBLIC_PASSPHRASE } from '$env/static/public';

	let pin = $state('');
	let name = $state('');
	let email = $state('');
	let error = $state('');
	let isLoading = $state(false);
	let mode = $state('login'); // 'login', 'signup'
	let signupRole = $state('student'); // 'student', 'teacher', 'reviewer'
	let loginRole = $state(''); // Required role selection for login

	async function login() {
		error = '';
		isLoading = true;

		if (!loginRole) {
			error = 'Please select your role';
			isLoading = false;
			return;
		}

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

			let result;
			if (loginRole === 'teacher') {
				result = await query(
					authedFetch,
					`SELECT id, name, 'teacher' as role FROM teachers WHERE pin = '${pin}'`
				);
			} else if (loginRole === 'student') {
				result = await query(
					authedFetch,
					`SELECT id, name, 'student' as role FROM students WHERE pin = '${pin}'`
				);
			} else if (loginRole === 'reviewer') {
				result = await query(
					authedFetch,
					`SELECT id, name, email, 'reviewer' as role FROM reviewers WHERE pin = '${pin}' AND is_active = TRUE`
				);
			}

			if (result && result.length > 0) {
				$user = result[0];
				goto('/');
				return;
			}

			error = `Invalid PIN for ${loginRole}`;
		} catch (e) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	async function signup() {
		error = '';
		isLoading = true;

		if (!name.trim()) {
			error = 'Name is required';
			isLoading = false;
			return;
		}

		if (signupRole === 'reviewer' && !email.trim()) {
			error = 'Email is required for reviewers';
			isLoading = false;
			return;
		}

		if (!/^\d+$/.test(pin)) {
			error = 'PIN must be numeric';
			isLoading = false;
			return;
		}

		if (pin.length < 4) {
			error = 'PIN must be at least 4 digits';
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

			let result;
			if (signupRole === 'teacher') {
				result = await signupTeacher(authedFetch, { name: name.trim(), pin });
			} else if (signupRole === 'reviewer') {
				result = await signupReviewer(authedFetch, { name: name.trim(), email: email.trim(), pin });
			} else {
				result = await signupStudent(authedFetch, { name: name.trim(), pin });
			}

			if (result.length > 0) {
				$user = result[0];
				goto('/');
				return;
			}

			error = 'Signup failed';
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

	function switchMode() {
		mode = mode === 'login' ? 'signup' : 'login';
		error = '';
		pin = '';
		name = '';
		email = '';
		loginRole = '';
		signupRole = 'student';
	}
</script>

<main class="container">
	<div class="login-card">
		<div class="card-header">
			<div class="icon-wrapper">
				{#if mode === 'login'}
					<svg class="lock-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M16 12V8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8V12M8 12H16M8 12C6.89543 12 6 12.8954 6 14V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V14C18 12.8954 17.1046 12 16 12Z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				{:else}
					<svg
						class="user-plus-icon"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M20 8V14M17 11H23M12.5 7C12.5 9.20914 10.7091 11 8.5 11C6.29086 11 4.5 9.20914 4.5 7C4.5 4.79086 6.29086 3 8.5 3C10.7091 3 12.5 4.79086 12.5 7Z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{/if}
			</div>
			<h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
			<p class="subtitle">
				{mode === 'login' ? 'Enter your PIN to access your account' : 'Sign up to get started'}
			</p>
		</div>

		<form on:submit|preventDefault={mode === 'login' ? login : signup} class="auth-form">
			{#if mode === 'login'}
				<div class="input-group">
					<label for="login-role-select">Select Your Role</label>
					<div class="role-selector">
						<label class="role-option">
							<input type="radio" bind:group={loginRole} value="student" disabled={isLoading} />
							<span class="role-label">
								<span class="role-icon">👨‍🎓</span>
								Student
							</span>
						</label>
						<label class="role-option">
							<input type="radio" bind:group={loginRole} value="teacher" disabled={isLoading} />
							<span class="role-label">
								<span class="role-icon">👨‍🏫</span>
								Teacher
							</span>
						</label>
						<label class="role-option">
							<input type="radio" bind:group={loginRole} value="reviewer" disabled={isLoading} />
							<span class="role-label">
								<span class="role-icon">👨‍💼</span>
								Reviewer
							</span>
						</label>
					</div>
				</div>
			{:else}
				<!-- Signup form content -->
			{/if}

			{#if mode === 'signup'}
				<div class="input-group">
					<label for="name-input">Full Name</label>
					<div class="input-wrapper">
						<input
							id="name-input"
							type="text"
							bind:value={name}
							on:input={handleInputChange}
							placeholder="Enter your full name"
							class:error
							disabled={isLoading}
							autocomplete="name"
						/>
						<div class="input-underline"></div>
					</div>
				</div>

				<div class="input-group">
					<label for="role-select">Account Type</label>
					<div class="role-selector">
						<label class="role-option">
							<input type="radio" bind:group={signupRole} value="student" disabled={isLoading} />
							<span class="role-label">
								<span class="role-icon">👨‍🎓</span>
								Student
							</span>
						</label>
						<label class="role-option">
							<input type="radio" bind:group={signupRole} value="teacher" disabled={isLoading} />
							<span class="role-label">
								<span class="role-icon">👨‍🏫</span>
								Teacher
							</span>
						</label>
						<label class="role-option">
							<input type="radio" bind:group={signupRole} value="reviewer" disabled={isLoading} />
							<span class="role-label">
								<span class="role-icon">👨‍💼</span>
								Reviewer
							</span>
						</label>
					</div>
				</div>

				{#if signupRole === 'reviewer'}
					<div class="input-group">
						<label for="email-input">Email Address</label>
						<div class="input-wrapper">
							<input
								id="email-input"
								type="email"
								bind:value={email}
								on:input={handleInputChange}
								placeholder="Enter your email address"
								class:error
								disabled={isLoading}
								autocomplete="email"
								required
							/>
							<div class="input-underline"></div>
						</div>
					</div>
				{/if}
			{/if}

			<div class="input-group">
				<label for="pin-input">{mode === 'signup' ? 'Create PIN' : 'PIN'}</label>
				<div class="input-wrapper">
					<input
						id="pin-input"
						type="password"
						bind:value={pin}
						on:input={handleInputChange}
						placeholder={mode === 'signup' ? 'Create a 4+ digit PIN' : 'Enter your PIN'}
						class:error
						disabled={isLoading}
						autocomplete="off"
						maxlength="10"
					/>
					<div class="input-underline"></div>
				</div>
				{#if mode === 'signup'}
					<p class="pin-hint">Your PIN must be at least 4 digits and contain only numbers</p>
				{/if}
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

			<button
				type="submit"
				class="auth-button"
				disabled={isLoading || !pin.trim() || (mode === 'signup' && !name.trim())}
			>
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
					{mode === 'login' ? 'Logging in...' : 'Creating account...'}
				{:else}
					{mode === 'login' ? 'Login' : 'Create Account'}
				{/if}
			</button>

			<div class="mode-switch">
				<button type="button" class="switch-button" on:click={switchMode} disabled={isLoading}>
					{mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
				</button>
			</div>
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
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		position: relative;
	}

	/* Login Card */
	.login-card {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
		border: 1px solid #e5e7eb;
		width: 100%;
		max-width: 420px;
		overflow: hidden;
		position: relative;
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
		background: #fafafa;
	}

	.icon-wrapper {
		display: inline-flex;
		padding: 1rem;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		border-radius: 50%;
		margin-bottom: 1.5rem;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
	}

	.lock-icon,
	.user-plus-icon {
		width: 2rem;
		height: 2rem;
		color: white;
	}

	h1 {
		font-size: 2rem;
		font-weight: 800;
		color: #111827;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.025em;
	}

	.subtitle {
		color: #6b7280;
		font-size: 1rem;
		margin: 0;
		font-weight: 400;
	}

	/* Form Styling */
	.auth-form {
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
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
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

	.pin-hint {
		margin: 0.5rem 0 0 0;
		font-size: 0.8rem;
		color: #6b7280;
		line-height: 1.4;
	}

	/* Role Selector */
	.role-selector {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.role-option {
		position: relative;
		cursor: pointer;
	}

	.role-option input[type='radio'] {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.role-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		background: #fafafa;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		font-weight: 500;
		color: #6b7280;
	}

	.role-option input[type='radio']:checked + .role-label {
		border-color: #2563eb;
		background: rgba(37, 99, 235, 0.05);
		color: #2563eb;
	}

	.role-option:hover .role-label {
		border-color: #d1d5db;
		background: #f3f4f6;
	}

	.role-option input[type='radio']:checked:hover + .role-label {
		border-color: #1d4ed8;
		background: rgba(37, 99, 235, 0.08);
	}

	.role-icon {
		font-size: 1.5rem;
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

	/* Mode Switch */
	.mode-switch {
		margin-top: 1.5rem;
		text-align: center;
	}

	.switch-button {
		background: transparent;
		border: none;
		color: #6b7280;
		font-size: 0.9rem;
		cursor: pointer;
		transition: color 0.2s ease;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.switch-button:hover:not(:disabled) {
		color: #2563eb;
	}

	.switch-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Auth Button */
	.auth-button {
		width: 100%;
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
		position: relative;
		overflow: hidden;
		letter-spacing: -0.01em;
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

	.auth-button:hover:not(:disabled) {
		background: linear-gradient(135deg, #1d4ed8, #1e40af);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
	}

	.auth-button:hover:not(:disabled)::before {
		left: 100%;
	}

	.auth-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.auth-button:disabled {
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
		background: #f9fafb;
		border-top: 1px solid #f3f4f6;
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

		.auth-form {
			padding: 0 1.5rem 1.5rem;
		}

		.role-selector {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.role-label {
			flex-direction: row;
			justify-content: center;
			padding: 0.75rem;
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

		.lock-icon,
		.user-plus-icon {
			width: 1.5rem;
			height: 1.5rem;
		}
	}

	/* Focus styles for accessibility */
	.auth-button:focus-visible,
	.switch-button:focus-visible,
	.role-option:focus-within .role-label {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}

	input:focus {
		outline: none;
	}
</style>
