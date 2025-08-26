import { page } from '@vitest/browser/context';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { user } from '$lib/user';
import { getStudentResults } from '$lib/api';

vi.mock('$lib/api', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		uploadTestText: vi.fn(),
		setTestActive: vi.fn(),
		assignTest: vi.fn(),
		getTeacherResults: vi.fn(),
		getAttemptAnswers: vi.fn(),
		getStudentResults: vi.fn(),
		getClassStudents: vi.fn().mockResolvedValue([]),
		requestClassJoin: vi.fn(),
		getPendingStudents: vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
		approveStudent: vi.fn(),
		deleteTest: vi.fn()
	};
});

import Page from './+page.svelte';

afterEach(() => {
	user.set(null);
});

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		render(Page, {
			props: {
				data: {
					tests: []
				}
			}
		});

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});

	it('shows pending student requests', async () => {
		user.set({ id: 1, role: 'teacher' });
		render(Page, {
			props: {
				data: {
					tests: []
				}
			}
		});

		const item = page.getByText('Alice');
		await expect.element(item).toBeInTheDocument();
	});

	it('displays assigned tests for students', async () => {
		user.set({ id: 2, role: 'student' });
		getStudentResults.mockResolvedValue([
			{ test_id: 1, title: 'Test', score: null, completed_at: null }
		]);
		render(Page, {
			props: {
				data: {
					tests: []
				}
			}
		});

		const link = page.getByRole('link', { name: 'Test' });
		await expect.element(link).toBeInTheDocument();
	});
});
