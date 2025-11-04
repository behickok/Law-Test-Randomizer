import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('user store', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('starts with null user', async () => {
		const { user } = await import('./user.js');
		let current;
		const unsubscribe = user.subscribe((value) => {
			current = value;
		});
		expect(current).toBeNull();
		unsubscribe();
	});

	it('set updates subscribers with provided value', async () => {
		const { user } = await import('./user.js');
		const account = { id: 7, role: 'teacher', name: 'Ada' };
		let current;
		const unsubscribe = user.subscribe((value) => {
			current = value;
		});
		user.set(account);
		expect(current).toEqual(account);
		user.set(null);
		expect(current).toBeNull();
		unsubscribe();
	});

	it('update callback and logout reset to null', async () => {
		const { user } = await import('./user.js');
		const seen = [];
		const unsubscribe = user.subscribe((value) => {
			seen.push(value);
		});

		user.update(() => ({ id: 3, role: 'student' }));
		expect(seen.at(-1)).toEqual({ id: 3, role: 'student' });

		user.logout();
		expect(seen.at(-1)).toBeNull();

		unsubscribe();
	});
});
