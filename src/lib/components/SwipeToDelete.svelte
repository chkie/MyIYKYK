<script lang="ts">
	import { hapticImpact, hapticSelection } from '../utils/haptics.js';

	let { children, onDelete }: { children: any; onDelete: () => void } = $props();

	let startX = $state(0);
	let currentX = $state(0);
	let isSwiping = $state(false);
	let hasVibrated = $state(false);
	let swipeDistance = $derived(currentX - startX);
	let shouldDelete = $derived(swipeDistance < -100); // 100px threshold

	function handleTouchStart(e: TouchEvent) {
		startX = e.touches[0].clientX;
		currentX = startX;
		isSwiping = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isSwiping) return;
		currentX = e.touches[0].clientX;
		
		// Trigger haptic when reaching delete threshold
		if (shouldDelete && !hasVibrated) {
			hapticImpact();
			hasVibrated = true;
		} else if (!shouldDelete) {
			hasVibrated = false;
		}
	}

	function handleTouchEnd() {
		if (shouldDelete) {
			// Trigger delete with haptic
			hapticSelection();
			onDelete();
		}
		// Reset
		isSwiping = false;
		startX = 0;
		currentX = 0;
		hasVibrated = false;
	}

	const transform = $derived(
		isSwiping && swipeDistance < 0 
			? `translateX(${Math.max(swipeDistance, -120)}px)` 
			: 'translateX(0)'
	);

	const deleteButtonOpacity = $derived(
		Math.min(Math.abs(swipeDistance) / 100, 1)
	);
</script>

<div class="relative overflow-hidden">
	<!-- Delete Background (revealed during swipe) -->
	<div 
		class="absolute inset-y-0 right-0 flex items-center justify-end bg-danger-500 px-6"
		style="opacity: {deleteButtonOpacity}"
	>
		<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
		</svg>
	</div>

	<!-- Content (swipeable) -->
	<div
		class="relative transition-transform {isSwiping ? 'duration-0' : 'duration-300 ease-out'}"
		style="transform: {transform}"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		{@render children()}
	</div>
</div>

<style>
	/* Prevent text selection during swipe */
	div {
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}
</style>

