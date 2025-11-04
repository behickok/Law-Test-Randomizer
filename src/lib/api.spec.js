import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './api.js';

if (typeof FormData === 'undefined') {
	class SimpleFormData {
		constructor() {
			this.store = new Map();
		}
		append(key, value) {
			if (!this.store.has(key)) {
				this.store.set(key, []);
			}
			this.store.get(key).push(String(value));
		}
		get(key) {
			const values = this.store.get(key);
			return values ? values[0] ?? null : null;
		}
	}
	globalThis.FormData = SimpleFormData;
}

const createFetchResponse = ({ ok, json, text }) => ({
	ok,
	json: json ? () => Promise.resolve(json) : undefined,
	text: text ? () => Promise.resolve(text) : undefined
});

describe('$lib/api', () => {
        afterEach(() => {
                vi.restoreAllMocks();
        });

        describe('uploadTestData', () => {
                it('builds multipart payload with optional fields', async () => {
                        const fetchMock = vi.fn().mockResolvedValue(createFetchResponse({ ok: true, json: { id: 99 } }));

			const result = await api.uploadTestData(fetchMock, {
				data: '   question data   ',
				title: 'Criminal Law',
				teacherId: '12',
				testId: '34',
				appendMode: true
			});

			expect(result).toEqual({ id: 99 });
			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [, options] = fetchMock.mock.calls[0];
			expect(options.method).toBe('POST');
			expect(options.body.get('data')).toBe('question data');
			expect(options.body.get('title')).toBe('Criminal Law');
			expect(options.body.get('teacher_id')).toBe('12');
			expect(options.body.get('test_id')).toBe('34');
			expect(options.body.get('append_mode')).toBe('true');
		});

		it('requires trimmed data string', async () => {
			const fetchMock = vi.fn();
			await expect(
				api.uploadTestData(fetchMock, {
					data: '   ',
					title: 'Contracts',
					teacherId: '1'
				})
			).rejects.toThrow('Test data is required');
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe('mutations', () => {
		it('assignTest posts validated payload', async () => {
			const fetchMock = vi.fn().mockResolvedValue(
				createFetchResponse({ ok: true, json: { attemptId: 99 } })
			);

			const result = await api.assignTest(fetchMock, {
				testId: '10',
				teacherId: '3',
				studentId: '25',
				studentName: 'Maggie O\'Connor'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/tests/assign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					testId: 10,
					teacherId: 3,
					studentId: 25,
					studentName: "Maggie O'Connor"
				})
			});
			expect(result).toEqual({ attemptId: 99 });
		});

		it('setTestActive only accepts boolean flag', async () => {
			const fetchMock = vi.fn().mockResolvedValue(
				createFetchResponse({ ok: true, json: { testId: 7, isActive: true } })
			);

			const result = await api.setTestActive(fetchMock, { testId: '7', teacherId: '3', isActive: true });

			expect(fetchMock).toHaveBeenCalledWith('/api/tests/active', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ testId: 7, teacherId: 3, isActive: true })
			});
			expect(result).toEqual({ testId: 7, isActive: true });

			await expect(
				api.setTestActive(fetchMock, { testId: '7', teacherId: '3', isActive: 'yes' })
			).rejects.toThrow('Invalid boolean value: yes');
		});

		it('addStudent links teacher when provided', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { student: { id: 42 } } }));

			await api.addStudent(fetchMock, { name: 'Student', pin: '1234', teacherId: '7' });

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/students', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Student', pin: '1234', teacherId: '7' })
			});
		});

		it('saveAttemptAnswer clears grading state when persisting response', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { success: true } }));

			await api.saveAttemptAnswer(fetchMock, {
				attemptId: '8',
				questionId: '15',
				choiceId: null,
				answerText: 'Essay response'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/attempts/8/answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					questionId: 15,
					choiceId: null,
					answerText: 'Essay response'
				})
			});
		});

		it('submitAttempt recalculates scores and returns summary', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({ ok: true, json: { id: 55, score: 18 } })
				);

			const result = await api.submitAttempt(fetchMock, { attemptId: '55' });
			expect(result).toEqual({ id: 55, score: 18 });
			expect(fetchMock).toHaveBeenCalledWith('/api/attempts/55/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
		});
	});

	describe('admin endpoints', () => {
		it('addTeacher posts to admin endpoint', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { teacher: { id: 1 } } }));

			await api.addTeacher(fetchMock, { name: 'New Teacher', pin: '4321' });

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/teachers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'New Teacher', pin: '4321' })
			});
		});

		it('getAllTeachers unwraps JSON payload', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { teachers: [{ id: 9 }] } }));

			const result = await api.getAllTeachers(fetchMock);

			expect(result).toEqual([{ id: 9 }]);
		});

		it('getAllReviewers returns active reviewers list', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { reviewers: [{ id: 5 }] } }));

			const result = await api.getAllReviewers(fetchMock);

			expect(fetchMock).toHaveBeenCalledWith('/api/reviewers');
			expect(result).toEqual([{ id: 5 }]);
		});

		it('getAllStudents maps credential metadata', async () => {
			const fetchMock = vi.fn().mockResolvedValue(
				createFetchResponse({
					ok: true,
					json: {
						students: [
							{ id: 1, name: 'Ada Lovelace', has_pin: 1, pin_is_hashed: 0 },
							{ id: 2, name: 'Grace Hopper', has_pin: 0, pin_is_hashed: 0 }
						]
					}
				})
			);

			const result = await api.getAllStudents(fetchMock);

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/students');
			expect(result).toEqual([
				{ id: 1, name: 'Ada Lovelace', hasPin: true, pinIsHashed: false, legacyPin: true },
				{ id: 2, name: 'Grace Hopper', hasPin: false, pinIsHashed: false, legacyPin: false }
			]);
		});

		it('getAllReviewersForAdmin normalises credential metadata', async () => {
			const fetchMock = vi.fn().mockResolvedValue(
				createFetchResponse({
					ok: true,
					json: {
						reviewers: [
							{
								id: 7,
								name: 'Jordan',
								email: 'jordan@example.com',
								is_active: true,
								has_pin: 1,
								pin_is_hashed: 1,
								created_at: '2024-01-01'
							}
						]
					}
				})
			);

			const result = await api.getAllReviewersForAdmin(fetchMock);

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/reviewers');
			expect(result).toEqual([
				{
					id: 7,
					name: 'Jordan',
					email: 'jordan@example.com',
					is_active: true,
					created_at: '2024-01-01',
					hasPin: true,
					pinIsHashed: true,
					legacyPin: false
				}
			]);
		});

		it('updateReviewer omits pin when not provided', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { success: true } }));

			await api.updateReviewer(fetchMock, {
				id: '4',
				name: 'Alex',
				email: 'alex@example.com',
				isActive: true
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/reviewers/4', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Alex',
					email: 'alex@example.com',
					isActive: true
				})
			});
		});

		it('updateReviewer includes pin when provided', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { success: true } }));

			await api.updateReviewer(fetchMock, {
				id: '4',
				name: 'Alex',
				email: 'alex@example.com',
				isActive: false,
				pin: '5678'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/reviewers/4', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Alex',
					email: 'alex@example.com',
					isActive: false,
					pin: '5678'
				})
			});
		});

		it('assignStudentToClass posts to classes endpoint', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { success: true } }));

			await api.assignStudentToClass(fetchMock, { studentId: '5', teacherId: '3' });

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/classes/assign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ studentId: 5, teacherId: 3 })
			});
		});

		it('copyTestToTeacher posts payload with validated values', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({ ok: true, json: { success: true, message: 'done' } })
				);

			await api.copyTestToTeacher(fetchMock, {
				testId: '11',
				fromTeacherId: '2',
				toTeacherId: '3',
				newTitle: 'Civ Pro'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/tests/copy', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					testId: 11,
					fromTeacherId: 2,
					toTeacherId: 3,
					newTitle: 'Civ Pro'
				})
			});
		});

		it('createReviewerInvitation posts payload', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({ ok: true, json: { invitation: { invite_code: 'abc' } } })
				);

			await api.createReviewerInvitation(fetchMock, {
				teacherId: '2',
				reviewerName: 'Pat',
				reviewerEmail: 'pat@example.com'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/reviewer-invitations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					teacherId: 2,
					reviewerName: 'Pat',
					reviewerEmail: 'pat@example.com'
				})
			});
		});

		it('getReviewerInvitations sends teacher header', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { invitations: [] } }));

			await api.getReviewerInvitations(fetchMock, '4');

			expect(fetchMock).toHaveBeenCalledWith('/api/admin/reviewer-invitations', {
				headers: { 'x-teacher-id': '4' }
			});
		});

                it('getClassStudents queries classes endpoint', async () => {
                        const fetchMock = vi
                                .fn()
                                .mockResolvedValue(createFetchResponse({ ok: true, json: { students: [{ id: 2 }] } }));

                        const students = await api.getClassStudents(fetchMock);

                        expect(fetchMock).toHaveBeenCalledWith('/api/classes/students');
                        expect(students).toEqual([{ id: 2 }]);
                });

		it('getStudentClassAssignments fetches student roster', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({ ok: true, json: { assignments: [{ teacher_id: 1 }] } })
				);

			const assignments = await api.getStudentClassAssignments(fetchMock, '5');

			expect(fetchMock).toHaveBeenCalledWith('/api/classes/student/5');
			expect(assignments).toEqual([{ teacher_id: 1 }]);
		});

		it('joinClassWithInviteCode posts invite data', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { success: true } }));

			await api.joinClassWithInviteCode(fetchMock, { studentId: '5', inviteCode: 'ABC123' });

			expect(fetchMock).toHaveBeenCalledWith('/api/classes/join', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ studentId: 5, inviteCode: 'ABC123' })
			});
		});

		it('signupTeacher posts to auth signup endpoint', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { user: { id: 1 } } }));

			await api.signupTeacher(fetchMock, { name: 'Alex', pin: '1234' });

			expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'teacher', name: 'Alex', pin: '1234' })
			});
		});

		it('signupStudent posts to auth signup endpoint', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { user: { id: 5 } } }));

			await api.signupStudent(fetchMock, { name: 'Jamie', pin: '4321' });

			expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'student', name: 'Jamie', pin: '4321' })
			});
		});

		it('signupReviewer posts reviewer payload', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({ ok: true, json: { user: { id: 7, email: 'pat@example.com' } } })
				);

			await api.signupReviewer(fetchMock, {
				name: 'Pat',
				email: 'pat@example.com',
				pin: '9876'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					role: 'reviewer',
					name: 'Pat',
					email: 'pat@example.com',
					pin: '9876'
				})
			});
		});

		it('signupReviewerWithInvite posts invite code', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { user: { id: 9 } } }));

			await api.signupReviewerWithInvite(fetchMock, { name: 'Quinn', pin: '2468', inviteCode: 'CODE123' });

			expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					role: 'reviewer',
					name: 'Quinn',
					pin: '2468',
					inviteCode: 'CODE123'
				})
			});
		});

		it('updateQuestion posts to question endpoint', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { question: { id: 1 } } }));

			await api.updateQuestion(fetchMock, {
				questionId: '9',
				text: 'Updated text',
				teacherId: '3',
				points: '5'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/questions/9', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ teacherId: 3, text: 'Updated text', points: 5 })
			});
		});

		it('updateChoice posts to choice endpoint', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { choice: { id: 2 } } }));

			await api.updateChoice(fetchMock, {
				choiceId: '11',
				text: 'Answer',
				isCorrect: true,
				teacherId: '3'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/choices/11', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: 'Answer', isCorrect: true, teacherId: 3 })
			});
		});

		it('getActiveTests fetches active list', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { tests: [{ id: 1 }] } }));

			const tests = await api.getActiveTests(fetchMock);

			expect(fetchMock).toHaveBeenCalledWith('/api/tests/active');
			expect(tests).toEqual([{ id: 1 }]);
		});

		it('getTestQuestions fetches teacher scoped questions', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({ ok: true, json: { questions: [{ id: 1, choices: [] }] } })
				);

			const questions = await api.getTestQuestions(fetchMock, { testId: '8', teacherId: '3' });

			expect(fetchMock).toHaveBeenCalledWith('/api/tests/8/questions?teacherId=3');
			expect(questions).toEqual([{ id: 1, choices: [] }]);
		});

		it('createReviewAssignment posts to server', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({ ok: true, json: { success: true, assignmentId: 10 } })
				);

			await api.createReviewAssignment(fetchMock, {
				testId: '3',
				teacherId: '5',
				reviewers: ['7', '8'],
				title: 'Midterm Review',
				description: 'Focus on essay questions',
				questionsPerReviewer: 20,
				overlapFactor: 2
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/review-assignments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					testId: 3,
					teacherId: 5,
					reviewers: [7, 8],
					title: 'Midterm Review',
					description: 'Focus on essay questions',
					questionsPerReviewer: 20,
					overlapFactor: 2
				})
			});
		});

		it('getReviewerAssignments queries reviewer endpoint', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { assignments: [] } }));

			const result = await api.getReviewerAssignments(fetchMock, '9');

			expect(fetchMock).toHaveBeenCalledWith('/api/reviewer-assignments?reviewerId=9');
			expect(result).toEqual([]);
		});

		it('submitQuestionReview posts JSON payload', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(createFetchResponse({ ok: true, json: { success: true } }));

			await api.submitQuestionReview(fetchMock, {
				reviewId: '12',
				rating: 4,
				feedback: 'Great question',
				suggestions: '',
				difficultyRating: 3,
				clarityRating: 4,
				relevanceRating: 5
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/reviewer-reviews/12', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rating: 4,
					feedback: 'Great question',
					suggestions: null,
					difficultyRating: 3,
					clarityRating: 4,
					relevanceRating: 5
				})
			});
		});
	});

	describe('startAttempt', () => {
		it('creates a new attempt with shuffled questions when none exists', async () => {
			const fetchMock = vi.fn().mockImplementation((url, options) => {
				if (url === '/api/attempts/start') {
					const body = JSON.parse(options.body);
					expect(body).toEqual({
						testId: 7,
						studentId: 5,
						studentName: "Alex O'Neil"
					});
					return createFetchResponse({
						ok: true,
						json: {
							attemptId: 901,
							test: { id: 7, title: 'Bar Exam', teacher_id: 3 },
							sections: [{ id: 11, section_name: 'Section A', section_order: 1, total_questions: 2 }],
							questions: [
								{
									id: 100,
									text: 'Question 1',
									points: 2,
									section_id: 11,
									section_name: 'Section A',
									section_order: 1,
									total_questions: 2,
									choices: [
										{ id: 201, text: 'Answer A', is_correct: true },
										{ id: 202, text: 'Answer B', is_correct: false }
									]
								},
								{
									id: 101,
									text: 'Question 2',
									points: 1,
									section_id: 11,
									section_name: 'Section A',
									section_order: 1,
									total_questions: 2,
									choices: [
										{ id: 203, text: 'Answer C', is_correct: true },
										{ id: 204, text: 'Answer D', is_correct: false }
									]
								}
							]
						}
					});
				}
				throw new Error(`Unexpected fetch call to ${url}`);
			});
			const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.3);

			const result = await api.startAttempt(fetchMock, {
				testId: '7',
				studentId: '5',
				studentName: "Alex O'Neil"
			});

			expect(result.attemptId).toBe(901);
			expect(result.test.title).toBe('Bar Exam');
			expect(result.questions.map((q) => q.id).sort()).toEqual([100, 101]);
			expect(result.questions[0]).toHaveProperty('processed_question_text', 'Question 1');
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/attempts/start',
				expect.objectContaining({ method: 'POST' })
			);
			mathSpy.mockRestore();
		});

		it('reuses an in-progress attempt when one exists', async () => {
			const fetchMock = vi.fn().mockResolvedValue(
				createFetchResponse({
					ok: true,
					json: {
						attemptId: 321,
						test: { id: 4, title: 'Practice Test', teacher_id: 1 },
						sections: [{ id: 55, section_name: 'Essays', section_order: 1, total_questions: 5 }],
						questions: [
							{
								id: 900,
								text: 'Essay Question',
								points: 10,
								section_id: 55,
								section_name: 'Essays',
								section_order: 1,
								total_questions: 5,
								choices: [],
								selected: null,
								response: 'Draft answer'
							}
						]
					}
				})
			);

			const result = await api.startAttempt(fetchMock, {
				testId: '4',
				studentId: '6',
				studentName: 'Jamie'
			});

			expect(result.attemptId).toBe(321);
			expect(result.questions).toHaveLength(1);
			expect(result.questions[0].response).toBe('Draft answer');
			expect(result.questions[0]).toHaveProperty('processed_question_text', 'Essay Question');
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/attempts/start',
				expect.objectContaining({ method: 'POST' })
			);
		});
	});

	describe('reviewer onboarding', () => {
		it('prevents duplicate reviewer emails', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({
						ok: false,
						text: 'Email already exists. Please choose a different email.'
					})
				);

			await expect(
				api.signupReviewer(fetchMock, { name: 'Morgan', email: 'taken@example.com', pin: '1234' })
			).rejects.toThrow('Email already exists. Please choose a different email.');
		});

		it('creates reviewer when validation passes', async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValue(
					createFetchResponse({
						ok: true,
						json: {
							user: { id: 8, name: "Morgan O'Neil", email: 'morgan@example.com', role: 'reviewer' }
						}
					})
				);

			const result = await api.signupReviewer(fetchMock, {
				name: "Morgan O'Neil",
				email: 'morgan@example.com',
				pin: '5678'
			});

			expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', expect.any(Object));
			expect(result).toEqual({
				user: { id: 8, name: "Morgan O'Neil", email: 'morgan@example.com', role: 'reviewer' }
			});
		});
	});
});
