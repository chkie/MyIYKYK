<script lang="ts">
	import { hapticImpact, hapticSelection } from '../utils/haptics.js';
	import { t } from '$lib/copy/index.js';

	let { 
		children, 
		onEdit, 
		onDelete 
	}: { 
		children: any; 
		onEdit?: () => void; 
		onDelete?: () => void; 
	} = $props();

	let startX = $state(0);
	let currentX = $state(0);
	let isSwiping = $state(false);
	let isLocked = $state(false); // Actions are visible and locked
	let hasVibrated = $state(false);
	let lockedOffset = $state(0); // Store locked position
	
	// Calculate swipe distance relative to locked state
	let swipeDistance = $derived(
		isSwiping 
			? (isLocked ? (currentX - startX + lockedOffset) : (currentX - startX))
			: lockedOffset
	);
	
	let isRevealed = $derived(swipeDistance < -30); // 30px threshold to reveal

	function handleTouchStart(e: TouchEvent) {
		startX = e.touches[0].clientX;
		currentX = e.touches[0].clientX;
		isSwiping = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isSwiping) return;
		currentX = e.touches[0].clientX;
		
		// Trigger haptic when revealing actions
		if (isRevealed && !hasVibrated) {
			hapticSelection();
			hasVibrated = true;
		} else if (!isRevealed) {
			hasVibrated = false;
		}
	}

	function handleTouchEnd() {
		const rawDistance = currentX - startX;
		const finalPosition = isLocked ? (rawDistance + lockedOffset) : rawDistance;
		const didMove = Math.abs(rawDistance) > 10; // 10px threshold to detect actual swipe vs tap
		
		isSwiping = false;
		
		// Only process if user actually moved (not just a tap)
		if (!didMove) {
			// Tap while locked - do nothing, stay locked
			startX = 0;
			currentX = 0;
			hasVibrated = false;
			return;
		}
		
		// Check final position to determine lock state
		if (finalPosition < -60) {
			// Swiped far enough left - lock open
			isLocked = true;
			lockedOffset = -120;
			if (!isLocked) hapticSelection(); // Only vibrate on first lock
		} else if (finalPosition > -20) {
			// Swiped back to right or near start - close
			isLocked = false;
			lockedOffset = 0;
		}
		// Else: stay in current lock state
		
		// Reset touch positions
		startX = 0;
		currentX = 0;
		hasVibrated = false;
	}

	const transform = $derived(
		isSwiping || isLocked
			? `translateX(${Math.max(Math.min(swipeDistance, 0), -120)}px)` 
			: 'translateX(0)'
	);
</script>

<div 
	class="relative overflow-hidden bg-white"
>
	<!-- Action Buttons (behind the card, always rendered) -->
	<div 
		class="absolute inset-y-0 right-0 z-0 flex items-center justify-end gap-2 pr-2"
	>
		{#if onEdit}
			<button
				type="button"
				aria-label={t('aria.edit')}
				onclick={(e) => {
					e.stopPropagation();
					hapticSelection();
					isLocked = false;
					lockedOffset = 0;
					onEdit();
				}}
				class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg transition-all active:scale-90"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
			</button>
		{/if}
		
		{#if onDelete}
			<button
				type="button"
				aria-label={t('aria.delete')}
				onclick={(e) => {
					e.stopPropagation();
					hapticImpact();
					isLocked = false;
					lockedOffset = 0;
					onDelete();
				}}
				class="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-500 text-white shadow-lg transition-all active:scale-90"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
		{/if}
	</div>

	<!-- Content (swipeable, above buttons) -->
	<div
		class="relative z-10 bg-white transition-transform {isSwiping ? 'duration-0' : 'duration-300 ease-out'}"
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
