<script>
	import { onMount } from 'svelte';
	import { user } from '$lib/user';
	import { 
		getReviewerAssignments,
		getQuestionsForReview,
		submitQuestionReview
	} from '$lib/api';

	let assignments = [];
	let selectedAssignment = null;
	let questionsToReview = [];
	let currentQuestionIndex = 0;
	let isLoading = false;
	let message = '';
	let messageType = '';

	// Review form state
	let rating = null;
	let feedback = '';
	let suggestions = '';
	let difficultyRating = null;
	let clarityRating = null;
	let relevanceRating = null;
	let expandedQuestions = new Set(); // Track which questions are expanded

	async function loadAssignments() {
		if (!$user || $user.role !== 'reviewer') return;
		
		isLoading = true;
		try {
			const result = await getReviewerAssignments(fetch, $user.id);
			assignments = Array.isArray(result) ? result : (result?.data ?? []);
		} catch (err) {
			console.error('Error loading assignments:', err);
			message = 'Failed to load review assignments';
			messageType = 'error';
		} finally {
			isLoading = false;
		}
	}

	async function selectAssignment(assignment) {
		selectedAssignment = assignment;
		isLoading = true;
		message = '';
		
		try {
			const result = await getQuestionsForReview(fetch, $user.id, assignment.id);
			questionsToReview = Array.isArray(result) ? result : (result?.data ?? []);
			currentQuestionIndex = 0;
			loadCurrentQuestionData();
		} catch (err) {
			console.error('Error loading questions:', err);
			message = 'Failed to load questions for review';
			messageType = 'error';
		} finally {
			isLoading = false;
		}
	}

	function loadCurrentQuestionData() {
		if (questionsToReview.length === 0) return;
		
		const currentQuestion = questionsToReview[currentQuestionIndex];
		rating = currentQuestion.rating;
		feedback = currentQuestion.feedback || '';
		suggestions = currentQuestion.suggestions || '';
		difficultyRating = currentQuestion.difficultyRating;
		clarityRating = currentQuestion.clarityRating;
		relevanceRating = currentQuestion.relevanceRating;
	}

	async function submitAllReviews() {
		isLoading = true;
		message = '';
		
		const reviewsToSubmit = questionsToReview.filter(q => 
			q.reviewStatus !== 'completed' && 
			(q.tempRating || q.tempFeedback?.trim() || q.tempSuggestions?.trim() || 
			 q.tempDifficultyRating || q.tempClarityRating || q.tempRelevanceRating)
		);

		if (reviewsToSubmit.length === 0) {
			message = 'No reviews to submit. Please add ratings or feedback to at least one question.';
			messageType = 'error';
			isLoading = false;
			return;
		}

		try {
			let successCount = 0;
			const errors = [];

			// Submit all reviews in parallel
			const submitPromises = reviewsToSubmit.map(async (question, index) => {
				try {
					await submitQuestionReview(fetch, {
						reviewId: question.reviewId,
						rating: question.tempRating || null,
						feedback: question.tempFeedback?.trim() || '',
						suggestions: question.tempSuggestions?.trim() || '',
						difficultyRating: question.tempDifficultyRating || null,
						clarityRating: question.tempClarityRating || null,
						relevanceRating: question.tempRelevanceRating || null
					});

					// Find the question in the original array and update it
					const questionIndex = questionsToReview.findIndex(q => q.reviewId === question.reviewId);
					if (questionIndex !== -1) {
						questionsToReview[questionIndex] = {
							...questionsToReview[questionIndex],
							reviewStatus: 'completed',
							rating: question.tempRating,
							feedback: question.tempFeedback || '',
							suggestions: question.tempSuggestions || '',
							difficultyRating: question.tempDifficultyRating,
							clarityRating: question.tempClarityRating,
							relevanceRating: question.tempRelevanceRating
						};
					}

					successCount++;
				} catch (err) {
					errors.push(`Question ${questionsToReview.findIndex(q => q.reviewId === question.reviewId) + 1}: ${err.message}`);
				}
			});

			await Promise.all(submitPromises);

			// Update the assignment completed count
			selectedAssignment.completed_questions += successCount;

			// Show results
			if (errors.length === 0) {
				message = `Successfully submitted ${successCount} review${successCount === 1 ? '' : 's'}!`;
				messageType = 'success';
			} else if (successCount > 0) {
				message = `Submitted ${successCount} reviews successfully, but ${errors.length} failed: ${errors.join(', ')}`;
				messageType = 'error';
			} else {
				message = `Failed to submit reviews: ${errors.join(', ')}`;
				messageType = 'error';
			}

			// Clear message after delay
			setTimeout(() => {
				message = '';
			}, 5000);

		} catch (err) {
			console.error('Error submitting reviews:', err);
			message = err.message || 'Failed to submit reviews';
			messageType = 'error';
		} finally {
			isLoading = false;
		}
	}
	
	function toggleQuestionExpansion(questionIndex) {
		if (expandedQuestions.has(questionIndex)) {
			expandedQuestions.delete(questionIndex);
		} else {
			expandedQuestions.add(questionIndex);
		}
		expandedQuestions = expandedQuestions; // Trigger reactivity
	}
	
	function updateQuestionField(questionIndex, field, value) {
		questionsToReview[questionIndex] = {
			...questionsToReview[questionIndex],
			[`temp${field.charAt(0).toUpperCase() + field.slice(1)}`]: value
		};
		questionsToReview = questionsToReview; // Trigger reactivity
	}

	function nextQuestion() {
		if (currentQuestionIndex < questionsToReview.length - 1) {
			currentQuestionIndex++;
			loadCurrentQuestionData();
		}
	}

	function previousQuestion() {
		if (currentQuestionIndex > 0) {
			currentQuestionIndex--;
			loadCurrentQuestionData();
		}
	}

	function goToQuestion(index) {
		currentQuestionIndex = index;
		loadCurrentQuestionData();
	}

	function backToAssignments() {
		selectedAssignment = null;
		questionsToReview = [];
		currentQuestionIndex = 0;
		rating = null;
		feedback = '';
		suggestions = '';
		difficultyRating = null;
		clarityRating = null;
		relevanceRating = null;
		message = '';
	}

	function getProgressPercentage(assignment) {
		if (assignment.total_questions === 0) return 0;
		return Math.round((assignment.completed_questions / assignment.total_questions) * 100);
	}

	function getRatingDisplay(ratingValue) {
		if (!ratingValue) return 'Not rated';
		return '★'.repeat(ratingValue) + '☆'.repeat(5 - ratingValue);
	}

	$: currentQuestion = questionsToReview[currentQuestionIndex];
	$: completedQuestions = questionsToReview.filter(q => q.reviewStatus === 'completed').length;
	$: totalQuestions = questionsToReview.length;
	$: progressPercentage = totalQuestions > 0 ? Math.round((completedQuestions / totalQuestions) * 100) : 0;

	onMount(() => {
		loadAssignments();
	});
</script>

<div class="reviewer-dashboard">
	{#if !selectedAssignment}
		<!-- Assignment List View -->
		<div class="dashboard-header">
			<h2>
				<span class="icon">📝</span>
				My Review Assignments
			</h2>
			<p class="subtitle">Review questions and provide feedback to help improve tests</p>
		</div>

		{#if isLoading}
			<div class="loading-state">
				<span class="loading-spinner">⏳</span>
				Loading assignments...
			</div>
		{:else if assignments.length === 0}
			<div class="empty-state">
				<span class="empty-icon">📋</span>
				<h3>No Review Assignments</h3>
				<p>You don't have any active review assignments at the moment.</p>
			</div>
		{:else}
			<div class="assignments-grid">
				{#each assignments as assignment (assignment.id)}
					<div class="assignment-card" on:click={() => selectAssignment(assignment)}>
						<div class="assignment-header">
							<h3>{assignment.title}</h3>
							<div class="assignment-meta">
								<span class="test-name">{assignment.test_title}</span>
								<span class="assigner">by {assignment.assigner_name}</span>
							</div>
						</div>

						<div class="assignment-progress">
							<div class="progress-bar">
								<div 
									class="progress-fill" 
									style="width: {getProgressPercentage(assignment)}%"
								></div>
							</div>
							<div class="progress-text">
								{assignment.completed_questions} / {assignment.total_questions} questions completed
								({getProgressPercentage(assignment)}%)
							</div>
						</div>

						{#if assignment.description}
							<div class="assignment-description">
								{assignment.description}
							</div>
						{/if}

						<div class="assignment-footer">
							<span class="created-date">
								Created: {new Date(assignment.created_at).toLocaleDateString()}
							</span>
							<button class="review-btn">
								{assignment.completed_questions === assignment.total_questions ? 'View Results' : 'Start Review'}
								<span class="btn-icon">→</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- Question Review View -->
		<div class="review-header">
			<button class="back-btn" on:click={backToAssignments}>
				<span class="back-icon">←</span>
				Back to Assignments
			</button>
			
			<div class="review-title">
				<h2>{selectedAssignment.title}</h2>
				<div class="review-progress">
					<span class="progress-text">
						Question {currentQuestionIndex + 1} of {totalQuestions}
					</span>
					<div class="mini-progress-bar">
						<div 
							class="mini-progress-fill" 
							style="width: {progressPercentage}%"
						></div>
					</div>
				</div>
			</div>
		</div>

		{#if questionsToReview.length > 0}
			<div class="questions-list">
				{#each questionsToReview as question, index}
					<div class="question-card {question.reviewStatus === 'completed' ? 'completed' : ''}">
						<div class="question-header">
							<h3>Question {index + 1}</h3>
							<div class="question-meta">
								<span class="question-points">{question.points} pts</span>
								{#if question.reviewStatus === 'completed'}
									<span class="completed-badge">✅ Reviewed</span>
								{/if}
							</div>
						</div>

						<div class="question-text">
							{@html question.questionText}
						</div>

						{#if question.choices && question.choices.length > 0}
							<div class="choices-list">
								{#each question.choices as choice, choiceIndex}
									<div class="choice-item {choice.isCorrect ? 'correct' : ''}">
										<span class="choice-letter">{String.fromCharCode(65 + choiceIndex)}</span>
										<span class="choice-text">{choice.text}</span>
										{#if choice.isCorrect}
											<span class="correct-indicator">✓</span>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<div class="review-section">
							<!-- Basic Review Fields (Always Visible) -->
							<div class="basic-review">
								<div class="rating-and-feedback">
									<div class="rating-group">
										<label>Rating</label>
										<div class="star-rating">
											{#each [1,2,3,4,5] as star}
												<button
													class="star-btn {(question.tempRating || question.rating) >= star ? 'active' : ''}"
													on:click={() => updateQuestionField(index, 'rating', star)}
													disabled={question.reviewStatus === 'completed'}
												>
													★
												</button>
											{/each}
										</div>
									</div>
									
									<div class="feedback-group">
										<label>Feedback</label>
										<textarea
											value={question.tempFeedback ?? question.feedback ?? ''}
											on:input={(e) => updateQuestionField(index, 'feedback', e.target.value)}
											placeholder="Quick feedback or observations..."
											rows="2"
											class="feedback-textarea"
											disabled={question.reviewStatus === 'completed'}
										></textarea>
									</div>
								</div>
								
								<div class="review-actions">
									<button 
										class="expand-btn" 
										on:click={() => toggleQuestionExpansion(index)}
										type="button"
									>
										{expandedQuestions.has(index) ? '↑ Less' : '↓ More'}
									</button>
								</div>
							</div>

							<!-- Detailed Review Fields (Expandable) -->
							{#if expandedQuestions.has(index)}
								<div class="detailed-review">
									<div class="detailed-ratings">
										<div class="rating-group">
											<label>Difficulty</label>
											<select 
												value={question.tempDifficultyRating ?? question.difficultyRating ?? ''}
												on:change={(e) => updateQuestionField(index, 'difficultyRating', e.target.value ? parseInt(e.target.value) : null)}
												class="form-select-compact"
												disabled={question.reviewStatus === 'completed'}
											>
												<option value="">Not rated</option>
												<option value="1">1 - Very Easy</option>
												<option value="2">2 - Easy</option>
												<option value="3">3 - Medium</option>
												<option value="4">4 - Hard</option>
												<option value="5">5 - Very Hard</option>
											</select>
										</div>

										<div class="rating-group">
											<label>Clarity</label>
											<select 
												value={question.tempClarityRating ?? question.clarityRating ?? ''}
												on:change={(e) => updateQuestionField(index, 'clarityRating', e.target.value ? parseInt(e.target.value) : null)}
												class="form-select-compact"
												disabled={question.reviewStatus === 'completed'}
											>
												<option value="">Not rated</option>
												<option value="1">1 - Very Unclear</option>
												<option value="2">2 - Unclear</option>
												<option value="3">3 - Acceptable</option>
												<option value="4">4 - Clear</option>
												<option value="5">5 - Very Clear</option>
											</select>
										</div>

										<div class="rating-group">
											<label>Relevance</label>
											<select 
												value={question.tempRelevanceRating ?? question.relevanceRating ?? ''}
												on:change={(e) => updateQuestionField(index, 'relevanceRating', e.target.value ? parseInt(e.target.value) : null)}
												class="form-select-compact"
												disabled={question.reviewStatus === 'completed'}
											>
												<option value="">Not rated</option>
												<option value="1">1 - Not Relevant</option>
												<option value="2">2 - Somewhat Relevant</option>
												<option value="3">3 - Relevant</option>
												<option value="4">4 - Very Relevant</option>
												<option value="5">5 - Extremely Relevant</option>
											</select>
										</div>
									</div>

									<div class="suggestions-group">
										<label>Suggestions for Improvement</label>
										<textarea
											value={question.tempSuggestions ?? question.suggestions ?? ''}
											on:input={(e) => updateQuestionField(index, 'suggestions', e.target.value)}
											placeholder="How could this question be improved?"
											rows="3"
											class="form-textarea"
											disabled={question.reviewStatus === 'completed'}
										></textarea>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Submit All Reviews Button -->
			<div class="submit-section">
				<div class="submit-summary">
					<p class="summary-text">
						{questionsToReview.filter(q => q.reviewStatus === 'completed').length} of {questionsToReview.length} questions reviewed
					</p>
					<p class="summary-hint">
						Add ratings or feedback to questions, then click submit to save all your reviews at once.
					</p>
				</div>
				<button 
					class="submit-all-btn" 
					on:click={submitAllReviews}
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="loading-spinner">⏳</span>
						Submitting Reviews...
					{:else}
						<span class="submit-icon">✓</span>
						Submit All Reviews
					{/if}
				</button>
			</div>

			{#if message}
				<div class="global-message {messageType}">
					<span class="message-icon">
						{messageType === 'success' ? '✅' : '❌'}
					</span>
					{message}
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.reviewer-dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	/* New Question List Interface */
	.questions-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.question-card {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.question-card.completed {
		border-color: #22c55e;
		background: #f0fdf4;
	}

	.question-card .question-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.question-card .question-header h3 {
		font-size: 1.1rem;
		font-weight: 700;
		margin: 0;
		color: #1f2937;
	}

	.question-meta {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.question-points {
		background: #dbeafe;
		color: #1e40af;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.completed-badge {
		background: #dcfce7;
		color: #166534;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.question-text {
		font-size: 1rem;
		line-height: 1.5;
		color: #374151;
		margin-bottom: 1rem;
	}

	.choices-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.choice-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		font-size: 0.9rem;
	}

	.choice-item.correct {
		border-color: #22c55e;
		background: #f0fdf4;
	}

	.choice-letter {
		width: 24px;
		height: 24px;
		background: #f3f4f6;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.8rem;
		color: #374151;
	}

	.choice-item.correct .choice-letter {
		background: #22c55e;
		color: white;
	}

	.choice-text {
		flex: 1;
	}

	.correct-indicator {
		color: #22c55e;
		font-weight: 600;
	}

	.review-section {
		border-top: 1px solid #e5e7eb;
		padding-top: 1rem;
	}

	.basic-review {
		display: flex;
		gap: 1.5rem;
		align-items: flex-end;
	}

	.rating-and-feedback {
		flex: 1;
		display: flex;
		gap: 1.5rem;
	}

	.rating-group {
		flex-shrink: 0;
	}

	.rating-group label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
		font-size: 0.9rem;
	}

	.star-rating {
		display: flex;
		gap: 0.25rem;
	}

	.star-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: #d1d5db;
		transition: color 0.2s;
		padding: 0;
	}

	.star-btn:hover,
	.star-btn.active {
		color: #fbbf24;
	}

	.star-btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.feedback-group {
		flex: 1;
	}

	.feedback-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		font-family: inherit;
		font-size: 0.9rem;
		resize: vertical;
		color: #374151;
	}

	.feedback-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.feedback-textarea:disabled {
		background: #f9fafb;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.review-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-end;
	}

	.expand-btn {
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		color: #374151;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.expand-btn:hover {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.submit-btn-compact {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.submit-btn-compact:hover:not(:disabled) {
		background: #2563eb;
	}

	.submit-btn-compact:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.detailed-review {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #f3f4f6;
		animation: slideDown 0.3s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			max-height: 0;
		}
		to {
			opacity: 1;
			max-height: 500px;
		}
	}

	.detailed-ratings {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-select-compact {
		width: 100%;
		padding: 0.5rem;
		border: 2px solid #e5e7eb;
		border-radius: 6px;
		font-size: 0.85rem;
		color: #374151;
	}

	.form-select-compact:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.suggestions-group label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
		font-size: 0.9rem;
	}

	.global-message {
		position: fixed;
		top: 2rem;
		right: 2rem;
		padding: 1rem 1.5rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		z-index: 1000;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	}

	.global-message.success {
		background: #f0fdf4;
		color: #166534;
		border: 2px solid #22c55e;
	}

	.global-message.error {
		background: #fef2f2;
		color: #dc2626;
		border: 2px solid #ef4444;
	}

	.message-icon {
		font-size: 1.2rem;
	}

	/* Submit Section Styles */
	.submit-section {
		margin-top: 3rem;
		padding: 2rem;
		background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
		border: 2px solid #22c55e;
		border-radius: 12px;
		text-align: center;
	}

	.submit-summary {
		margin-bottom: 1.5rem;
	}

	.summary-text {
		font-size: 1.1rem;
		font-weight: 600;
		color: #166534;
		margin: 0 0 0.5rem 0;
	}

	.summary-hint {
		font-size: 0.9rem;
		color: #22c55e;
		margin: 0;
		opacity: 0.8;
	}

	.submit-all-btn {
		background: linear-gradient(135deg, #22c55e, #16a34a);
		color: white;
		border: none;
		padding: 1rem 2.5rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
	}

	.submit-all-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, #16a34a, #15803d);
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4);
	}

	.submit-all-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.submit-icon {
		font-size: 1.25rem;
		font-weight: bold;
	}

	.loading-spinner {
		animation: spin 1s linear infinite;
		font-size: 1.25rem;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.dashboard-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.dashboard-header h2 {
		font-size: 2.5rem;
		font-weight: 800;
		margin: 0 0 0.5rem 0;
		color: #1f2937;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.icon {
		font-size: 2.5rem;
	}

	.subtitle {
		font-size: 1.1rem;
		color: #6b7280;
		margin: 0;
	}

	.loading-state, .empty-state {
		text-align: center;
		padding: 4rem 2rem;
	}

	.loading-spinner {
		font-size: 1.5rem;
		animation: spin 1s linear infinite;
	}

	.empty-state {
		color: #6b7280;
	}

	.empty-icon {
		font-size: 4rem;
		display: block;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.assignments-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
	}

	.assignment-card {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.assignment-card:hover {
		border-color: #3b82f6;
		box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
		transform: translateY(-2px);
	}

	.assignment-header h3 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		color: #1f2937;
	}

	.assignment-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		color: #6b7280;
		font-size: 0.9rem;
	}

	.test-name {
		font-weight: 600;
	}

	.assignment-progress {
		margin: 1.5rem 0;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #22c55e, #16a34a);
		transition: width 0.3s ease;
	}

	.progress-text {
		margin-top: 0.5rem;
		font-size: 0.9rem;
		color: #374151;
		font-weight: 500;
	}

	.assignment-description {
		background: #f8fafc;
		padding: 1rem;
		border-radius: 8px;
		color: #475569;
		font-size: 0.95rem;
		margin: 1rem 0;
		border-left: 4px solid #e2e8f0;
	}

	.assignment-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.created-date {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.review-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.review-btn:hover {
		background: #2563eb;
	}

	.btn-icon {
		font-size: 1.1rem;
	}

	/* Review View Styles */
	.review-header {
		display: flex;
		align-items: center;
		gap: 2rem;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.back-btn {
		background: #f3f4f6;
		border: 2px solid #d1d5db;
		color: #374151;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		transition: all 0.2s;
	}

	.back-btn:hover {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.back-icon {
		font-size: 1.1rem;
	}

	.review-title {
		flex: 1;
	}

	.review-title h2 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		color: #1f2937;
	}

	.review-progress {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.mini-progress-bar {
		width: 200px;
		height: 6px;
		background: #e5e7eb;
		border-radius: 3px;
		overflow: hidden;
	}

	.mini-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #22c55e, #16a34a);
		transition: width 0.3s ease;
	}

	.question-review {
		display: grid;
		grid-template-columns: 1fr 400px;
		gap: 3rem;
		margin-bottom: 3rem;
	}

	.question-panel {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}

	.question-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.question-header h3 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		color: #1f2937;
	}

	.question-points {
		background: #dbeafe;
		color: #1e40af;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.question-text {
		font-size: 1.1rem;
		line-height: 1.6;
		color: #374151;
		margin-bottom: 2rem;
	}

	.choices-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.choice-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.choice-item.correct {
		border-color: #22c55e;
		background: #f0fdf4;
	}

	.choice-letter {
		width: 30px;
		height: 30px;
		background: #f3f4f6;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		color: #374151;
	}

	.choice-item.correct .choice-letter {
		background: #22c55e;
		color: white;
	}

	.choice-text {
		flex: 1;
		color: #374151;
	}

	.correct-indicator {
		color: #22c55e;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.review-form {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
		height: fit-content;
	}

	.review-form h4 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 1.5rem 0;
		color: #1f2937;
	}

	.completed-banner {
		background: #f0fdf4;
		border: 2px solid #22c55e;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #166534;
		font-weight: 600;
	}

	.completed-icon {
		font-size: 1.2rem;
	}

	.rating-section {
		margin-bottom: 2rem;
	}

	.rating-group {
		margin-bottom: 1.5rem;
	}

	.rating-group label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.star-rating {
		display: flex;
		gap: 0.25rem;
	}

	.star-btn {
		background: none;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: #d1d5db;
		transition: color 0.2s;
	}

	.star-btn:hover,
	.star-btn.active {
		color: #fbbf24;
	}

	.star-btn:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.detailed-ratings {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.form-select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.95rem;
		color: #374151;
	}

	.form-select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: #374151;
	}

	.form-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.95rem;
		resize: vertical;
		color: #374151;
	}

	.form-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-textarea:disabled {
		background: #f9fafb;
		cursor: not-allowed;
		opacity: 0.6;
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

	.submit-btn {
		width: 100%;
		background: #3b82f6;
		color: white;
		border: none;
		padding: 1rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.submit-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.submit-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.question-navigation {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem 2rem;
	}

	.nav-btn {
		background: #f3f4f6;
		border: 2px solid #d1d5db;
		color: #374151;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		transition: all 0.2s;
	}

	.nav-btn:hover:not(:disabled) {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.nav-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-icon {
		font-size: 1.1rem;
	}

	.question-dots {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		max-width: 600px;
		justify-content: center;
	}

	.question-dot {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 2px solid #e5e7eb;
		background: white;
		color: #6b7280;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.question-dot:hover {
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.question-dot.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}

	.question-dot.completed {
		background: #22c55e;
		border-color: #22c55e;
		color: white;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@media (max-width: 1024px) {
		.question-review {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.assignments-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.reviewer-dashboard {
			padding: 1rem;
		}

		.review-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.review-progress {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.mini-progress-bar {
			width: 100%;
		}

		.question-navigation {
			flex-direction: column;
			gap: 1.5rem;
		}

		.question-dots {
			order: -1;
		}

		.detailed-ratings {
			grid-template-columns: 1fr;
		}
	}
</style>