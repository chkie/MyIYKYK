/**
 * Haptic Feedback Utilities
 * Provides tactile feedback using the Web Vibration API
 */

export function hapticSelection(): void {
	if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
		navigator.vibrate(10);
	}
}

export function hapticImpact(): void {
	if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
		navigator.vibrate(20);
	}
}

export function hapticNotification(type: 'success' | 'warning' | 'error' = 'success'): void {
	if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
		switch (type) {
			case 'success':
				navigator.vibrate([10, 50, 10]);
				break;
			case 'warning':
				navigator.vibrate([20, 50, 20]);
				break;
			case 'error':
				navigator.vibrate([30, 50, 30, 50, 30]);
				break;
		}
	}
}
