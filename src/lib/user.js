import { writable } from 'svelte/store';

const internalStore = writable(null);

export const user = {
	subscribe: internalStore.subscribe,
	set: (value) => {
		internalStore.set(value ?? null);
	},
	update: (updater) => {
		internalStore.update((current) => {
			const updated = updater(current);
			return updated ?? null;
		});
	},
	logout: () => {
		internalStore.set(null);
	}
};
