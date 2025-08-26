<script>
	import { user } from '$lib/user';
</script>

<div class="help-container">
	<header class="help-header">
		<div class="header-content">
			<div class="header-left">
				<h1 class="help-title">
					<span class="help-icon">📚</span>
					Help Center
				</h1>
				<p class="help-subtitle">Learn how to use the Law Test Randomizer</p>
			</div>
			<nav class="header-nav">
				<a href="/" class="nav-link">
					<span class="nav-icon">🏠</span>
					Back to Dashboard
				</a>
			</nav>
		</div>
	</header>

	<main class="help-content">
		<div class="help-grid">
			<!-- Quick Start Guide -->
			<section class="help-card quick-start-card">
				<div class="card-header">
					<h2 class="card-title">
						<span class="section-icon">🚀</span>
						Quick Start Guide
					</h2>
				</div>
				<div class="card-content">
					<div class="step-list">
						<div class="step-item">
							<div class="step-number">1</div>
							<div class="step-content">
								<h3>Sign Up or Log In</h3>
								<p>Create a new account or log in with your existing PIN</p>
							</div>
						</div>
						<div class="step-item">
							<div class="step-number">2</div>
							<div class="step-content">
								<h3>Navigate Dashboard</h3>
								<p>Use the main dashboard to access all features based on your role</p>
							</div>
						</div>
						<div class="step-item">
							<div class="step-number">3</div>
							<div class="step-content">
								<h3>Start Working</h3>
								<p>Teachers can upload tests, students can take assigned tests</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- Teacher Guide -->
			<section class="help-card teacher-card">
				<div class="card-header">
					<h2 class="card-title">
						<span class="section-icon">👨‍🏫</span>
						Teacher Guide
					</h2>
				</div>
				<div class="card-content">
					<div class="feature-list">
                                                <div class="feature-item">
                                                        <h4>📝 Paste Tests</h4>
                                                        <p>Paste CSV rows containing your law test questions. Use the provided template to ensure proper formatting, preview the questions, and remove any you don't need before saving.</p>
                                                </div>
						<div class="feature-item">
							<h4>📋 Manage Tests</h4>
							<p>Activate or deactivate tests as needed. Only active tests can be taken by students.</p>
						</div>
						<div class="feature-item">
							<h4>🎯 Assign Tests</h4>
							<p>Assign specific tests to individual students in your class.</p>
						</div>
						<div class="feature-item">
							<h4>👥 Manage Students</h4>
							<p>Review and approve student requests to join your class.</p>
						</div>
						<div class="feature-item">
							<h4>📊 View Results</h4>
							<p>See detailed test results including scores and individual answers for each student.</p>
						</div>
					</div>
				</div>
			</section>

			<!-- Student Guide -->
			<section class="help-card student-card">
				<div class="card-header">
					<h2 class="card-title">
						<span class="section-icon">👨‍🎓</span>
						Student Guide
					</h2>
				</div>
				<div class="card-content">
					<div class="feature-list">
						<div class="feature-item">
							<h4>🏫 Join a Class</h4>
							<p>Enter your teacher's PIN to request access to their class. Wait for approval.</p>
						</div>
						<div class="feature-item">
							<h4>📝 Take Tests</h4>
							<p>Click on assigned tests to start taking them. Questions will be randomized for each attempt.</p>
						</div>
						<div class="feature-item">
							<h4>📈 View Scores</h4>
							<p>See your completed test scores on your dashboard. Detailed results are available to your teacher.</p>
						</div>
					</div>
				</div>
			</section>
		</div>

		<!-- Detailed Instructions -->
		<section class="help-card instructions-card">
			<div class="card-header">
				<h2 class="card-title">
					<span class="section-icon">📖</span>
					Detailed Instructions
				</h2>
			</div>
			<div class="card-content">
				<div class="instruction-tabs">
					<div class="tab-content">
						<div class="instruction-section">
                                                        <h3>📁 CSV Format for Pasting</h3>
                                                        <p>When pasting questions, your CSV rows should follow this format:</p>
							<div class="template-info-box">
								<h4>💡 Quick Start with Template</h4>
                                                                <p>The easiest way to get started is to download our CSV template from the "Edit Test Questions" section. It includes:</p>
								<ul>
									<li>Correct header format</li>
									<li>5 sample law questions</li>
									<li>Proper CSV formatting examples</li>
									<li>Ready to customize with your content</li>
								</ul>
							</div>

							<div class="code-block">
								<pre>Question,Option A,Option B,Option C,Option D,Correct Answer
"What is the primary source of law?","Constitution","Statutes","Case Law","Regulations","A"
"Which amendment protects freedom of speech?","First","Second","Fourth","Fifth","A"</pre>
							</div>
							<div class="format-notes">
								<h4>Important Notes:</h4>
								<ul>
									<li>First row must contain headers exactly as shown</li>
									<li>Correct Answer column should contain the letter (A, B, C, or D)</li>
									<li>Questions and options can contain quotes - use proper CSV escaping</li>
									<li>Each row represents one question with four multiple choice options</li>
								</ul>
							</div>
						</div>

						<div class="instruction-section">
							<h3>🔐 Account Management</h3>
							<div class="account-info">
								<div class="info-item">
									<h4>Creating an Account</h4>
									<p>New users can create accounts directly from the login page. Click "Don't have an account? Sign up" to get started. Choose your role (Student or Teacher) and create a secure numeric PIN.</p>
								</div>
								<div class="info-item">
									<h4>Login</h4>
									<p>Use your assigned or created PIN to log in. PINs are numeric and must be unique across the system.</p>
								</div>
								<div class="info-item">
									<h4>PIN Requirements</h4>
									<p>PINs must be at least 4 digits long, contain only numbers, and be unique across all users.</p>
								</div>
								<div class="info-item">
									<h4>Role-Based Access</h4>
									<p>Your role (Teacher or Student) determines which features you can access. This is set during account creation.</p>
								</div>
								<div class="info-item">
									<h4>Logout</h4>
									<p>Always log out when finished to protect your account security.</p>
								</div>
							</div>
						</div>

						<div class="instruction-section">
							<h3>🔧 Admin Features</h3>
							<p><strong>For Teachers Only:</strong> The Admin panel allows you to:</p>
							<ul>
								<li>Add new teacher accounts</li>
								<li>Add new student accounts</li>
								<li>Run database queries for advanced management</li>
								<li>View system statistics and usage data</li>
							</ul>
						</div>

						<div class="instruction-section">
							<h3>🎲 Test Randomization</h3>
							<div class="randomization-info">
								<p>The system automatically randomizes tests to ensure academic integrity:</p>
								<ul>
									<li><strong>Question Order:</strong> Questions appear in different orders for each student</li>
									<li><strong>Fair Assessment:</strong> All students receive the same questions, just in random order</li>
									<li><strong>Automatic Process:</strong> No additional setup required - randomization happens automatically</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- FAQ Section -->
		<section class="help-card faq-card">
			<div class="card-header">
				<h2 class="card-title">
					<span class="section-icon">❓</span>
					Frequently Asked Questions
				</h2>
			</div>
			<div class="card-content">
				<div class="faq-list">
					<details class="faq-item">
						<summary class="faq-question">How do I create an account?</summary>
						<div class="faq-answer">
							<p>From the login page, click "Don't have an account? Sign up". Fill in your full name, choose your role (Student or Teacher), and create a numeric PIN of at least 4 digits. Your PIN must be unique - if someone already uses that PIN, you'll need to choose a different one.</p>
						</div>
					</details>

                                        <details class="faq-item">
                                                <summary class="faq-question">How do I add a test?</summary>
                                                <div class="faq-answer">
                                                        <p>As a teacher, go to your dashboard and open the "Edit Test Questions" section. Choose an existing test or create a new one, paste your CSV rows, preview the questions and click "Save Test".</p>
                                                </div>
                                        </details>
					
					<details class="faq-item">
						<summary class="faq-question">Why can't my student see the test I uploaded?</summary>
						<div class="faq-answer">
							<p>There are three possible reasons:</p>
							<ul>
								<li>The test needs to be activated (toggle the status in "Manage Tests")</li>
								<li>The test needs to be assigned to the specific student</li>
								<li>The student needs to be approved to join your class</li>
							</ul>
						</div>
					</details>
					
					<details class="faq-item">
						<summary class="faq-question">How do students join my class?</summary>
						<div class="faq-answer">
							<p>Students enter your teacher PIN in the "Join Teacher's Class" section. You'll see their request in "Pending Requests" and can approve them. Your teacher PIN is the same PIN you use to log in.</p>
						</div>
					</details>
					
					<details class="faq-item">
						<summary class="faq-question">Can students retake tests?</summary>
						<div class="faq-answer">
							<p>Currently, students can only take each assigned test once. Once completed, they can view their score but cannot retake the test.</p>
						</div>
					</details>
					
					<details class="faq-item">
						<summary class="faq-question">How is test randomization handled?</summary>
						<div class="faq-answer">
							<p>The system automatically randomizes the order of questions for each student when they take a test. This happens behind the scenes - no setup required. All students get the same questions, just in different orders.</p>
						</div>
					</details>
					
					<details class="faq-item">
						<summary class="faq-question">I forgot my PIN. How do I recover it?</summary>
						<div class="faq-answer">
							<p>PINs cannot be recovered through the application. If you created your account recently, you may need to create a new account with a different PIN. For older accounts, contact your system administrator who can reset your PIN with database access.</p>
						</div>
					</details>
					
					<details class="faq-item">
						<summary class="faq-question">My PIN is already taken. What should I do?</summary>
						<div class="faq-answer">
							<p>All PINs must be unique across the system. If you get an error saying your PIN already exists, try a different number combination. Consider using a longer PIN (more than 4 digits) for better uniqueness.</p>
						</div>
					</details>
					
					<details class="faq-item">
						<summary class="faq-question">What file formats are supported for tests?</summary>
						<div class="faq-answer">
							<p>Currently, only CSV (Comma Separated Values) files are supported. Make sure to follow the exact format shown in the detailed instructions above.</p>
						</div>
					</details>
				</div>
			</div>
		</section>

		<!-- Contact Support -->
		<section class="help-card support-card">
			<div class="card-header">
				<h2 class="card-title">
					<span class="section-icon">💬</span>
					Need More Help?
				</h2>
			</div>
			<div class="card-content">
				<div class="support-content">
					<p>If you can't find the answer to your question in this help center, please contact your system administrator or IT support team.</p>
					<div class="support-tips">
						<h4>When contacting support, please provide:</h4>
						<ul>
							<li>Your role (Teacher or Student)</li>
							<li>What you were trying to do</li>
							<li>Any error messages you received</li>
							<li>Screenshots if applicable</li>
						</ul>
					</div>
				</div>
			</div>
		</section>
	</main>
</div>

<style>
	* {
		box-sizing: border-box;
	}

	.help-container {
		min-height: 100vh;
		background: #f9fafb;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		color: #111827;
	}

	.help-header {
		background: #ffffff;
		border-bottom: 1px solid #e5e7eb;
		padding: 2rem 0;
		margin-bottom: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.help-title {
		font-size: 2.5rem;
		font-weight: 900;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		color: #111827;
		letter-spacing: -0.025em;
	}

	.help-icon {
		font-size: 2.75rem;
	}

	.help-subtitle {
		font-size: 1.1rem;
		color: #6b7280;
		margin: 0;
		font-weight: 500;
	}

	.header-nav {
		display: flex;
		align-items: center;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		border: none;
		border-radius: 8px;
		color: white;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.875rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
		letter-spacing: -0.01em;
	}

	.nav-link:hover {
		background: linear-gradient(135deg, #1d4ed8, #1e40af);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
	}

	.nav-icon {
		font-size: 1.25rem;
	}

	.help-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.help-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.help-card {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		transition:
			transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
			box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
			border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		animation: fadeInUp 0.5s ease-out;
	}

	.help-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		border-color: #d1d5db;
	}

	.instructions-card,
	.faq-card,
	.support-card {
		grid-column: 1 / -1;
	}

	.card-header {
		padding: 1.5rem;
		border-bottom: 1px solid #f3f4f6;
		background: #fafafa;
	}

	.card-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		color: #111827;
	}

	.section-icon {
		font-size: 1.75rem;
	}

	.card-content {
		padding: 1.5rem;
	}

	.step-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.step-item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		color: white;
		border-radius: 50%;
		font-weight: 700;
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.step-content h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.step-content p {
		margin: 0;
		color: #6b7280;
		line-height: 1.6;
	}

	.feature-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.feature-item h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.feature-item p {
		margin: 0;
		color: #6b7280;
		line-height: 1.6;
	}

	.instruction-section {
		margin-bottom: 2rem;
	}

	.instruction-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: #1f2937;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.code-block {
		background: #1e293b;
		border-radius: 8px;
		overflow-x: auto;
		margin: 1rem 0;
	}

	.code-block pre {
		padding: 1rem;
		margin: 0;
		color: #e2e8f0;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.template-info-box {
		background: rgba(16, 185, 129, 0.05);
		border: 1px solid rgba(16, 185, 129, 0.2);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.template-info-box h4 {
		margin: 0 0 0.75rem 0;
		color: #059669;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.template-info-box p {
		margin: 0 0 0.75rem 0;
		color: #374151;
		line-height: 1.6;
	}

	.template-info-box ul {
		margin: 0;
		padding-left: 1.25rem;
		color: #374151;
	}

	.template-info-box li {
		margin-bottom: 0.5rem;
		line-height: 1.5;
	}

	.format-notes {
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 8px;
		padding: 1rem;
		margin-top: 1rem;
	}

	.format-notes h4 {
		margin: 0 0 0.75rem 0;
		color: #2563eb;
		font-weight: 600;
	}

	.format-notes ul {
		margin: 0;
		padding-left: 1.25rem;
		color: #374151;
	}

	.format-notes li {
		margin-bottom: 0.5rem;
		line-height: 1.5;
	}

	.account-info {
		display: grid;
		gap: 1rem;
	}

	.info-item h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.info-item p {
		margin: 0;
		color: #6b7280;
		line-height: 1.6;
	}

	.randomization-info ul {
		margin: 0.75rem 0 0 0;
		padding-left: 1.25rem;
		color: #374151;
	}

	.randomization-info li {
		margin-bottom: 0.5rem;
		line-height: 1.5;
	}

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.faq-item {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}

	.faq-question {
		padding: 1rem;
		background: #f9fafb;
		cursor: pointer;
		font-weight: 600;
		color: #1f2937;
		border-bottom: 1px solid #e5e7eb;
		transition: background-color 0.2s ease;
		list-style: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.faq-question::-webkit-details-marker {
		display: none;
	}

	.faq-question:hover {
		background: #f3f4f6;
	}

	.faq-question::after {
		content: '+';
		font-size: 1.25rem;
		font-weight: 300;
		color: #6b7280;
		transition: transform 0.2s ease;
	}

	.faq-item[open] .faq-question::after {
		transform: rotate(45deg);
	}

	.faq-answer {
		padding: 1rem;
		background: white;
	}

	.faq-answer p {
		margin: 0 0 0.75rem 0;
		color: #374151;
		line-height: 1.6;
	}

	.faq-answer ul {
		margin: 0;
		padding-left: 1.25rem;
		color: #374151;
	}

	.faq-answer li {
		margin-bottom: 0.5rem;
		line-height: 1.5;
	}

	.support-content p {
		margin: 0 0 1.5rem 0;
		color: #374151;
		line-height: 1.6;
		font-size: 1.1rem;
	}

	.support-tips h4 {
		margin: 0 0 0.75rem 0;
		font-weight: 600;
		color: #1f2937;
	}

	.support-tips ul {
		margin: 0;
		padding-left: 1.25rem;
		color: #374151;
	}

	.support-tips li {
		margin-bottom: 0.5rem;
		line-height: 1.5;
	}

	/* Animations */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: 1.5rem;
			text-align: center;
		}

		.help-title {
			font-size: 2rem;
		}

		.help-content {
			padding: 0 1rem 4rem;
		}

		.help-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.card-header {
			padding: 1rem;
		}

		.card-content {
			padding: 1rem;
		}

		.step-item {
			flex-direction: column;
			text-align: center;
			gap: 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.help-title {
			font-size: 1.75rem;
			flex-direction: column;
			gap: 0.5rem;
		}

		.code-block pre {
			font-size: 0.75rem;
		}
	}

	/* Focus states for accessibility */
	.nav-link:focus,
	.faq-question:focus {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}

	/* Enhanced hover effects */
	.help-card:hover .section-icon {
		transform: scale(1.1);
		transition: transform 0.3s ease;
	}

	.step-number {
		transition: transform 0.2s ease;
	}

	.step-item:hover .step-number {
		transform: scale(1.1);
	}
</style>