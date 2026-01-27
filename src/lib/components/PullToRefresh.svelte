<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { hapticSelection } from '../utils/haptics.js';

	let { children }: { children: any } = $props();

	let startY = $state(0);
	let currentY = $state(0);
	let isPulling = $state(false);
	let isRefreshing = $state(false);
	let pullDistance = $derived(Math.max(0, currentY - startY));
	let shouldRefresh = $derived(pullDistance > 80); // 80px threshold

	// Check if at top of page
	function isAtTop(): boolean {
		return window.scrollY === 0;
	}

	function handleTouchStart(e: TouchEvent) {
		if (!isAtTop() || isRefreshing) return;
		startY = e.touches[0].clientY;
		currentY = startY;
		isPulling = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isPulling || isRefreshing) return;
		currentY = e.touches[0].clientY;
		
		// Prevent default scroll if pulling down at top
		if (pullDistance > 0) {
			e.preventDefault();
		}
	}

	async function handleTouchEnd() {
		if (!isPulling) return;
		
		if (shouldRefresh && !isRefreshing) {
			isRefreshing = true;
			hapticSelection();
			
			// Refresh data
			try {
				await invalidateAll();
				// Wait a bit to show the animation
				await new Promise(resolve => setTimeout(resolve, 500));
			} finally {
				isRefreshing = false;
			}
		}
		
		// Reset
		isPulling = false;
		startY = 0;
		currentY = 0;
	}

	const pullProgress = $derived(Math.min(pullDistance / 80, 1));
	const spinnerRotation = $derived(pullProgress * 360);
</script>

<div 
	class="relative"
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<!-- Pull-to-Refresh Indicator -->
	{#if (isPulling && pullDistance > 10) || isRefreshing}
		<div 
			class="absolute left-1/2 -translate-x-1/2 transition-all duration-200"
			style="top: {Math.min(pullDistance - 40, 40)}px; opacity: {Math.min(pullProgress, 1)}"
		>
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 shadow-lg">
				{#if isRefreshing}
					<svg class="h-6 w-6 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				{:else}
					<svg 
						class="h-6 w-6 text-primary-600 transition-transform"
						style="transform: rotate({spinnerRotation}deg)"
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Content -->
	<div style="transform: translateY({isPulling || isRefreshing ? Math.min(pullDistance, 80) : 0}px); transition: {isPulling ? 'none' : 'transform 0.3s ease-out'}">
		{@render children()}
	</div>
</div>

