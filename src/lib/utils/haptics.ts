/**
 * Haptic Feedback Helper
 * Provides vibration feedback on mobile devices
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback (vibration) on supported devices
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
	// Check if vibration API is available
	if (!navigator.vibrate) return;

	// Vibration patterns (in milliseconds)
	const patterns: Record<HapticStyle, number | number[]> = {
		light: 10,
		medium: 20,
		heavy: 30,
		success: [10, 50, 10],
		warning: [20, 100, 20],
		error: [30, 100, 30, 100, 30]
	};

	navigator.vibrate(patterns[style]);
}

/**
 * Trigger selection haptic (for buttons, taps)
 */
export function hapticSelection(): void {
	triggerHaptic('light');
}

/**
 * Trigger impact haptic (for destructive actions)
 */
export function hapticImpact(): void {
	triggerHaptic('medium');
}

/**
 * Trigger notification haptic (for success/error feedback)
 */
export function hapticNotification(type: 'success' | 'warning' | 'error'): void {
	triggerHaptic(type);
}

