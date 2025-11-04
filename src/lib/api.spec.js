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

const createSqlFetchMock = (handlers = []) => {
	const calls = [];
	const matchHandler = (sql) =>
		handlers.find((handler) => {
			if (typeof handler.when === 'function') return handler.when(sql);
			if (handler.when instanceof RegExp) return handler.when.test(sql);
			return false;
		});

	const mock = vi.fn().mockImplementation(async (_url, options = {}) => {
		const body = options.body ? JSON.parse(options.body) : {};
		const sql = body.sql || '';
		calls.push(sql);

		const handler = matchHandler(sql);
		if (handler) {
			const result = await handler.response(sql);
			if (result && result.error) {
				return { ok: false, text: async () => result.error };
			}
			return { ok: true, json: async () => result };
		}

		return { ok: true, json: async () => [] };
	});

	mock.getSqlCalls = () => calls;
	return mock;
};

describe('$lib/api', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('query', () => {
		it('sends SQL payload and returns parsed JSON', async () => {
			const fetchMock = vi.fn().mockResolvedValue(createFetchResponse({ ok: true, json: [{ id: 1 }] }));
			const result = await api.query(fetchMock, 'SELECT 1');

			expect(fetchMock).toHaveBeenCalledWith('/api/query', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sql: 'SELECT 1' })
			});
			expect(result).toEqual([{ id: 1 }]);
		});

		it('throws when the API responds with an error', async () => {
			const fetchMock = vi.fn().mockResolvedValue(
				createFetchResponse({ ok: false, text: 'database connection failed' })
			);
			await expect(api.query(fetchMock, 'SELECT 1')).rejects.toThrow('database connection failed');
		});
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
		it('assignTest sanitises SQL values', async () => {
			const fetchMock = createSqlFetchMock();

			await api.assignTest(fetchMock, {
				testId: '10',
				studentId: '25',
				studentName: "Maggie O'Connor"
			});

			const [sql] = fetchMock.getSqlCalls();
			expect(sql).toContain("Maggie O''Connor");
		});

		it('setTestActive only accepts boolean flag', async () => {
			const fetchMock = createSqlFetchMock();

			await api.setTestActive(fetchMock, { testId: '7', teacherId: '3', isActive: true });

			const [sql] = fetchMock.getSqlCalls();
			expect(sql).toContain('SET is_active = TRUE');
			expect(sql).toContain('WHERE id = 7 AND teacher_id = 3');

			await expect(
				api.setTestActive(fetchMock, { testId: '7', teacherId: '3', isActive: 'yes' })
			).rejects.toThrow('Invalid boolean value: yes');
		});

		it('addStudent links teacher when provided', async () => {
			const fetchMock = createSqlFetchMock([
				{
					when: (sql) => sql.startsWith('INSERT INTO students'),
					response: () => [{ id: 42 }]
				},
				{
					when: (sql) => sql.startsWith('INSERT INTO classes'),
					response: (sql) => {
						expect(sql).toContain('INSERT INTO classes (teacher_id, student_id)');
						expect(sql).toMatch(/\(7,\s*42\)/);
						return [];
					}
				}
			]);

			await api.addStudent(fetchMock, { name: 'Student', pin: '1234', teacherId: '7' });
			expect(fetchMock.getSqlCalls().length).toBe(2);
		});

		it('saveAttemptAnswer clears grading state when persisting response', async () => {
			const fetchMock = createSqlFetchMock([
				{
					when: (sql) => sql.startsWith('UPDATE attempt_answers'),
					response: () => []
				}
			]);

			await api.saveAttemptAnswer(fetchMock, {
				attemptId: '8',
				questionId: '15',
				choiceId: null,
				answerText: 'Essay response'
			});

			const [sql] = fetchMock.getSqlCalls();
			expect(sql).toContain('UPDATE attempt_answers SET choice_id = NULL');
			expect(sql).toContain("answer_text = 'Essay response'");
			expect(sql).toContain('WHERE attempt_id = 8 AND question_id = 15');
		});

		it('submitAttempt recalculates scores and returns summary', async () => {
			const fetchMock = createSqlFetchMock([
				{
					when: (sql) => sql.startsWith('UPDATE attempt_answers'),
					response: () => []
				},
				{
					when: (sql) => sql.startsWith('UPDATE test_attempts'),
					response: () => []
				},
				{
					when: (sql) => sql.startsWith('SELECT score'),
					response: () => [{ score: 18 }]
				}
			]);

			const result = await api.submitAttempt(fetchMock, { attemptId: '55' });
			expect(result).toEqual({ id: 55, score: 18 });
			const executedSql = fetchMock.getSqlCalls();
			expect(executedSql[0]).toContain('UPDATE attempt_answers aa SET');
			expect(executedSql[1]).toContain('UPDATE test_attempts SET score');
			expect(executedSql[2]).toContain('SELECT score FROM test_attempts WHERE id = 55');
		});
	});

	describe('startAttempt', () => {
		it('creates a new attempt with shuffled questions when none exists', async () => {
			const fetchMock = createSqlFetchMock([
				{
					when: (sql) => sql.startsWith('select id, title'),
					response: () => [{ id: 7, title: 'Bar Exam', teacher_id: 3 }]
				},
				{
					when: (sql) => sql.startsWith('SELECT id FROM test_attempts'),
					response: () => []
				},
				{
					when: (sql) => sql.startsWith('select id, section_name'),
					response: () => [{ id: 11, section_name: 'Section A', section_order: 1, total_questions: 2 }]
				},
				{
					when: (sql) => sql.startsWith('select q.id as question_id'),
					response: () => [
						{
							question_id: 100,
							question_text: 'Question 1',
							points: 2,
							section_id: 11,
							section_name: 'Section A',
							section_order: 1,
							total_questions: 2,
							choice_id: 201,
							choice_text: 'Answer A',
							is_correct: true
						},
						{
							question_id: 100,
							question_text: 'Question 1',
							points: 2,
							section_id: 11,
							section_name: 'Section A',
							section_order: 1,
							total_questions: 2,
							choice_id: 202,
							choice_text: 'Answer B',
							is_correct: false
						},
						{
							question_id: 101,
							question_text: 'Question 2',
							points: 1,
							section_id: 11,
							section_name: 'Section A',
							section_order: 1,
							total_questions: 2,
							choice_id: 203,
							choice_text: 'Answer C',
							is_correct: true
						}
					]
				},
				{
					when: (sql) => sql.startsWith('INSERT INTO test_attempts'),
					response: () => [{ id: 901 }]
				},
				{
					when: (sql) => sql.startsWith('INSERT INTO attempt_answers'),
					response: (sql) => {
						expect(sql).toContain('INSERT INTO attempt_answers (attempt_id, question_id) VALUES');
						expect(sql).toContain('(901, 100)');
						expect(sql).toContain('(901, 101)');
						return [];
					}
				}
			]);
			const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.3);

			const result = await api.startAttempt(fetchMock, {
				testId: '7',
				studentId: '5',
				studentName: "Alex O'Neil"
			});

			expect(result.attemptId).toBe(901);
			expect(result.test.title).toBe('Bar Exam');
			expect(result.questions.map((q) => q.id).sort()).toEqual([100, 101]);
			const sqlHistory = fetchMock.getSqlCalls();
			expect(sqlHistory.some((sql) => sql.includes('(901, 100)') && sql.includes('(901, 101)'))).toBe(true);
			expect(sqlHistory.some((sql) => sql.includes("Alex O''Neil"))).toBe(true);
			mathSpy.mockRestore();
		});

		it('reuses an in-progress attempt when one exists', async () => {
			const fetchMock = createSqlFetchMock([
				{
					when: (sql) => sql.startsWith('select id, title'),
					response: () => [{ id: 4, title: 'Practice Test', teacher_id: 1 }]
				},
				{
					when: (sql) => sql.startsWith('SELECT id FROM test_attempts'),
					response: () => [{ id: 321 }]
				},
				{
					when: (sql) => sql.startsWith('select id, section_name'),
					response: () => [{ id: 55, section_name: 'Essays', section_order: 1, total_questions: 5 }]
				},
				{
					when: (sql) => sql.startsWith('select aa.id as attempt_answer_id'),
					response: () => [
						{
							attempt_answer_id: 1,
							question_id: 900,
							question_text: 'Essay Question',
							points: 10,
							section_id: 55,
							section_name: 'Essays',
							section_order: 1,
							total_questions: 5,
							choice_id: null,
							choice_text: null,
							is_correct: null,
							selected_choice: null,
							answer_text: 'Draft answer'
						}
					]
				}
			]);

			const result = await api.startAttempt(fetchMock, {
				testId: '4',
				studentId: '6',
				studentName: 'Jamie'
			});

			expect(result.attemptId).toBe(321);
			expect(result.questions).toHaveLength(1);
			expect(result.questions[0].response).toBe('Draft answer');
		});
	});

	describe('reviewer onboarding', () => {
		it('prevents duplicate reviewer emails', async () => {
			const fetchMock = createSqlFetchMock([
				{ when: (sql) => sql.includes('FROM teachers WHERE pin'), response: () => [] },
				{ when: (sql) => sql.includes('FROM reviewers WHERE pin'), response: () => [] },
				{ when: (sql) => sql.includes('FROM students WHERE pin'), response: () => [] },
				{ when: (sql) => sql.includes('SELECT 1 FROM reviewers WHERE email'), response: () => [1] }
			]);

			await expect(
				api.signupReviewer(fetchMock, { name: 'Morgan', email: 'taken@example.com', pin: '1234' })
			).rejects.toThrow('Email already exists. Please choose a different email.');
		});

		it('creates reviewer when validation passes', async () => {
			const fetchMock = createSqlFetchMock([
				{ when: (sql) => sql.includes('FROM teachers WHERE pin'), response: () => [] },
				{ when: (sql) => sql.includes('FROM students WHERE pin'), response: () => [] },
				{ when: (sql) => sql.includes('FROM reviewers WHERE pin'), response: () => [] },
				{ when: (sql) => sql.includes('SELECT 1 FROM reviewers WHERE email'), response: () => [] },
				{
					when: (sql) => sql.startsWith('INSERT INTO reviewers'),
					response: (sql) => {
						expect(sql).toContain("Morgan O''Neil");
						return [{ id: 8, name: "Morgan O'Neil", email: 'morgan@example.com', role: 'reviewer' }];
					}
				}
			]);

			const result = await api.signupReviewer(fetchMock, {
				name: "Morgan O'Neil",
				email: 'morgan@example.com',
				pin: '5678'
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result[0].email).toBe('morgan@example.com');
		});
	});
});
