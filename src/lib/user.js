import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Helper function to get initial user from localStorage
function getStoredUser() {
	if (!browser) return null;

	try {
		const stored = localStorage.getItem('law-test-user');
		return stored ? JSON.parse(stored) : null;
	} catch (error) {
		console.warn('Failed to parse stored user data:', error);
		localStorage.removeItem('law-test-user');
		return null;
	}
}

// Helper function to store user in localStorage
function storeUser(userData) {
	if (!browser) return;

	try {
		if (userData) {
			localStorage.setItem('law-test-user', JSON.stringify(userData));
		} else {
			localStorage.removeItem('law-test-user');
		}
	} catch (error) {
		console.warn('Failed to store user data:', error);
	}
}

// Create the user store with initial value from localStorage
function createUserStore() {
	const { subscribe, set, update } = writable(getStoredUser());

	return {
		subscribe,
		set: (value) => {
			storeUser(value);
			set(value);
		},
		update: (updater) => {
			update((current) => {
				const newValue = updater(current);
				storeUser(newValue);
				return newValue;
			});
		},
		// Convenience method to clear user
		logout: () => {
			storeUser(null);
			set(null);
		}
	};
}

export const user = createUserStore();
