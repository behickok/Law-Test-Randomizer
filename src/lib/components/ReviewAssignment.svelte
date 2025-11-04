<script>
	import { createEventDispatcher } from 'svelte';
	import { user } from '$lib/user';
	import { 
		createReviewAssignment,
		getTestsForTeacher,
		getAllReviewers,
		getTestQuestions
	} from '$lib/api';

	const dispatch = createEventDispatcher();

	let { visible = false } = $props();

	let selectedTestId = $state('');
	let title = $state('');
	let description = $state('');
	let questionsPerReviewer = $state(80);
	let overlapFactor = $state(2);
	let selectedReviewers = $state([]);
	let availableTests = $state([]);
	let availableReviewers = $state([]);
	let isLoading = $state(false);
	let message = $state('');
	let messageType = $state('');
	let testQuestionCount = $state(0);

	async function loadData() {
		if (!$user || $user.role !== 'teacher') return;
		
		try {
                        const [testsRes, reviewersRes] = await Promise.all([
                                getTestsForTeacher(fetch),
                                getAllReviewers(fetch)
                        ]);
			
			availableTests = Array.isArray(testsRes) ? testsRes : (testsRes?.data ?? []);
			availableReviewers = Array.isArray(reviewersRes) ? reviewersRes : [];
		} catch (err) {
			console.error('Error loading data:', err);
			message = 'Failed to load tests and reviewers';
			messageType = 'error';
		}
	}

	async function loadTestQuestionCount() {
		if (!selectedTestId) {
			testQuestionCount = 0;
			return;
		}
		
                try {
                        const questions = await getTestQuestions(fetch, { testId: selectedTestId });
			testQuestionCount = questions.length;
			
			// Auto-adjust questions per reviewer if needed
			if (selectedReviewers.length > 0) {
				const recommendedPerReviewer = Math.ceil((testQuestionCount * overlapFactor) / selectedReviewers.length);
				questionsPerReviewer = Math.min(Math.max(recommendedPerReviewer, 10), testQuestionCount);
			}
		} catch (err) {
			console.error('Error loading question count:', err);
			testQuestionCount = 0;
		}
	}

	async function handleSubmit() {
		if (!selectedTestId || !title.trim() || selectedReviewers.length === 0) {
			message = 'Please fill in all required fields';
			messageType = 'error';
			return;
		}

		if (selectedReviewers.length < 2 && overlapFactor > 1) {
			message = 'You need at least 2 reviewers for overlap, or set overlap factor to 1';
			messageType = 'error';
			return;
		}

		isLoading = true;
		message = '';

		try {
			const result = await createReviewAssignment(fetch, {
				testId: selectedTestId,
				teacherId: $user.id,
				reviewers: selectedReviewers,
				title: title.trim(),
				description: description.trim(),
				questionsPerReviewer,
				overlapFactor
			});

			message = result.message;
			messageType = 'success';
			
			// Reset form
			resetForm();
			
			// Dispatch event to parent
			dispatch('assignmentCreated', result);
			
			// Close modal after short delay
			setTimeout(() => {
				visible = false;
				message = '';
			}, 2000);

		} catch (err) {
			message = err.message || 'Failed to create review assignment';
			messageType = 'error';
		} finally {
			isLoading = false;
		}
	}

	function resetForm() {
		selectedTestId = '';
		title = '';
		description = '';
		questionsPerReviewer = 80;
		overlapFactor = 2;
		selectedReviewers = [];
		testQuestionCount = 0;
	}

	function handleReviewerToggle(reviewerId) {
		const index = selectedReviewers.indexOf(reviewerId);
		if (index > -1) {
			selectedReviewers = selectedReviewers.filter(id => id !== reviewerId);
		} else {
			selectedReviewers = [...selectedReviewers, reviewerId];
		}
	}

	function close() {
		visible = false;
		message = '';
		messageType = '';
	}

	// Calculate assignment preview
	const totalAssignments = $derived(selectedReviewers.length > 0 ? Math.min(testQuestionCount * overlapFactor, selectedReviewers.length * questionsPerReviewer) : 0);
	const avgQuestionsPerReviewer = $derived(selectedReviewers.length > 0 ? Math.round(totalAssignments / selectedReviewers.length) : 0);

	// Load data when component becomes visible
	$effect(() => {
		if (visible) {
			loadData();
		}
	});

	// Load question count when test changes
	$effect(() => {
		if (selectedTestId) {
			loadTestQuestionCount();
		}
	});
</script>

{#if visible}
	<div class="modal-backdrop" on:click|self={close}>
		<div class="modal-content">
			<div class="modal-header">
				<h2>Create Review Assignment</h2>
				<button class="close-btn" on:click={close}>&times;</button>
			</div>

			<div class="modal-body">
				<form on:submit|preventDefault={handleSubmit}>
					<!-- Test Selection -->
					<div class="form-group">
						<label for="test-select">Select Test *</label>
						<select
							id="test-select"
							bind:value={selectedTestId}
							class="form-input"
							required
						>
							<option value="">Choose a test...</option>
							{#each availableTests as test (test.id)}
								<option value={test.id}>
									{test.title} {test.is_active ? '(Active)' : '(Inactive)'}
								</option>
							{/each}
						</select>
					</div>

					{#if testQuestionCount > 0}
						<div class="info-box">
							<span class="info-icon">📊</span>
							This test has <strong>{testQuestionCount} questions</strong>
						</div>
					{/if}

					<!-- Assignment Details -->
					<div class="form-group">
						<label for="assignment-title">Assignment Title *</label>
						<input
							id="assignment-title"
							type="text"
							bind:value={title}
							placeholder="e.g., Constitutional Law Review - Spring 2024"
							class="form-input"
							required
						/>
					</div>

					<div class="form-group">
						<label for="assignment-description">Description</label>
						<textarea
							id="assignment-description"
							bind:value={description}
							placeholder="Optional: Add instructions or context for reviewers..."
							rows="3"
							class="form-input"
						></textarea>
					</div>

					<!-- Review Settings -->
					<div class="form-row">
						<div class="form-group">
							<label for="questions-per-reviewer">Questions per Reviewer</label>
							<input
								id="questions-per-reviewer"
								type="number"
								bind:value={questionsPerReviewer}
								min="1"
								max={testQuestionCount}
								class="form-input"
							/>
						</div>

						<div class="form-group">
							<label for="overlap-factor">Overlap Factor</label>
							<select id="overlap-factor" bind:value={overlapFactor} class="form-input">
								<option value={1}>1 (Each question reviewed once)</option>
								<option value={2}>2 (Each question reviewed twice)</option>
								<option value={3}>3 (Each question reviewed three times)</option>
							</select>
						</div>
					</div>

					<!-- Reviewer Selection -->
					<div class="form-group">
						<label>Select Reviewers * ({selectedReviewers.length} selected)</label>
						<div class="reviewer-grid">
							{#each availableReviewers as reviewer (reviewer.id)}
								<label class="reviewer-item">
									<input
										type="checkbox"
										checked={selectedReviewers.includes(reviewer.id)}
										on:change={() => handleReviewerToggle(reviewer.id)}
									/>
									<span class="checkmark"></span>
									<span class="reviewer-name">{reviewer.name}</span>
								</label>
							{/each}
						</div>
					</div>

					{#if selectedReviewers.length > 0 && testQuestionCount > 0}
						<div class="assignment-preview">
							<h4>Assignment Preview</h4>
							<div class="preview-stats">
								<div class="stat">
									<span class="stat-label">Total Reviews:</span>
									<span class="stat-value">{totalAssignments}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Avg. per Reviewer:</span>
									<span class="stat-value">{avgQuestionsPerReviewer}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Coverage:</span>
									<span class="stat-value">{Math.round((totalAssignments / testQuestionCount) * 100 / overlapFactor)}%</span>
								</div>
							</div>
						</div>
					{/if}

					{#if message}
						<div class="message {messageType}">
							<span class="message-icon">
								{messageType === 'success' ? '✅' : '❌'}
							</span>
							{message}
						</div>
					{/if}

					<div class="modal-actions">
						<button type="button" class="btn btn-secondary" on:click={close}>
							Cancel
						</button>
						<button 
							type="submit" 
							class="btn btn-primary" 
							disabled={isLoading || !selectedTestId || !title.trim() || selectedReviewers.length === 0}
						>
							{#if isLoading}
								<span class="loading-spinner">⏳</span>
								Creating...
							{:else}
								Create Assignment
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	.modal-content {
		background: white;
		border-radius: 12px;
		max-width: 700px;
		width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		animation: slideInUp 0.3s ease-out;
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #f9fafb;
		border-radius: 12px 12px 0 0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 4px;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: #dc2626;
	}

	.modal-body {
		padding: 2rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.form-input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.info-box {
		background: #f0f9ff;
		border: 2px solid #0ea5e9;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #0c4a6e;
	}

	.info-icon {
		font-size: 1.25rem;
	}

	.reviewer-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
		max-height: 200px;
		overflow-y: auto;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
	}

	.reviewer-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 6px;
		transition: background-color 0.2s;
	}

	.reviewer-item:hover {
		background: #f3f4f6;
	}

	.reviewer-item input[type="checkbox"] {
		display: none;
	}

	.checkmark {
		width: 20px;
		height: 20px;
		border: 2px solid #d1d5db;
		border-radius: 4px;
		position: relative;
		transition: all 0.2s;
	}

	.reviewer-item input[type="checkbox"]:checked + .checkmark {
		background: #2563eb;
		border-color: #2563eb;
	}

	.reviewer-item input[type="checkbox"]:checked + .checkmark:after {
		content: '✓';
		position: absolute;
		top: -2px;
		left: 3px;
		color: white;
		font-weight: bold;
	}

	.reviewer-name {
		font-weight: 500;
	}

	.assignment-preview {
		background: #f0fdf4;
		border: 2px solid #22c55e;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.assignment-preview h4 {
		margin: 0 0 1rem 0;
		color: #166534;
		font-size: 1.1rem;
	}

	.preview-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #166534;
		font-weight: 500;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #15803d;
	}

	.message {
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
	}

	.message.success {
		background: #f0fdf4;
		color: #166534;
		border: 2px solid #22c55e;
	}

	.message.error {
		background: #fef2f2;
		color: #dc2626;
		border: 2px solid #ef4444;
	}

	.message-icon {
		font-size: 1.2rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-secondary {
		background: #f3f4f6;
		border: 2px solid #d1d5db;
		color: #374151;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.btn-primary {
		background: #2563eb;
		border: 2px solid #2563eb;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
		border-color: #1d4ed8;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading-spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@media (max-width: 768px) {
		.modal-content {
			width: 95vw;
			margin: 1rem;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.reviewer-grid {
			grid-template-columns: 1fr;
		}

		.preview-stats {
			grid-template-columns: 1fr;
		}

		.modal-actions {
			flex-direction: column;
		}
	}
</style>
