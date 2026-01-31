/**
 * Profile selection store (using Svelte 5 runes)
 * Stores which user is currently using the app (Christian or Steffi)
 */

let currentProfileId = $state<string | null>(null);
let currentProfileName = $state<string | null>(null);
let isInitialized = $state(typeof window !== 'undefined'); // SSR-safe: true on client, false on server

// Load from localStorage on client
if (typeof window !== 'undefined') {
	const stored = localStorage.getItem('myiykyk_profile');
	if (stored) {
		try {
			const data = JSON.parse(stored);
			currentProfileId = data.id;
			currentProfileName = data.name;
		} catch (e) {
			console.error('Failed to parse stored profile:', e);
		}
	}
}

export const profileStore = {
	get currentProfileId() {
		return currentProfileId;
	},
	get currentProfileName() {
		return currentProfileName;
	},
	get isInitialized() {
		return isInitialized;
	},
	get hasProfile() {
		return !!currentProfileId;
	},
	
	setProfile(id: string, name: string) {
		currentProfileId = id;
		currentProfileName = name;
		if (typeof window !== 'undefined') {
			localStorage.setItem('myiykyk_profile', JSON.stringify({ id, name }));
		}
	},
	
	clearProfile() {
		currentProfileId = null;
		currentProfileName = null;
		if (typeof window !== 'undefined') {
			localStorage.removeItem('myiykyk_profile');
		}
	}
};
