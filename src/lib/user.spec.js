import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'law-test-user';

const createLocalStorageMock = () => {
	let store = new Map();
	return {
		getItem: (key) => (store.has(key) ? store.get(key) : null),
		setItem: (key, value) => store.set(key, value),
		removeItem: (key) => store.delete(key),
		clear: () => store.clear()
	};
};

describe('user store', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.mock('$app/environment', () => ({ browser: true }));
		globalThis.localStorage = createLocalStorageMock();
	});

	it('hydrates initial value from localStorage', async () => {
		const storedUser = { id: 1, name: 'Ada', role: 'teacher' };
		globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedUser));

		const { user } = await import('./user.js');

		let current;
		const unsubscribe = user.subscribe((value) => {
			current = value;
		});

		expect(current).toEqual(storedUser);
		unsubscribe();
	});

	it('persists updates made via set', async () => {
		const { user } = await import('./user.js');

		user.set({ id: 2, role: 'student' });

		expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe(
			JSON.stringify({ id: 2, role: 'student' })
		);
	});

	it('supports updating with a callback and clearing state on logout', async () => {
		const { user } = await import('./user.js');

		let seenValues = [];
		const unsubscribe = user.subscribe((value) => {
			seenValues.push(value);
		});

		user.update(() => ({ id: 3, role: 'reviewer' }));
		expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe(
			JSON.stringify({ id: 3, role: 'reviewer' })
		);

		user.logout();
		expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe(null);

		unsubscribe();
		// last emitted value should be null
		expect(seenValues.at(-1)).toBeNull();
	});
});

