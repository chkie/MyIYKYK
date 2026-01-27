<script lang="ts">
	/**
	 * Boot/Loading Screen Component
	 * 
	 * Minimal, accessible loading screen shown during initial app hydration.
	 * Respects prefers-reduced-motion for animations.
	 */
</script>

<div
	id="boot-screen"
	class="boot-screen"
	role="status"
	aria-live="polite"
	aria-label="Anwendung wird geladen"
>
	<div class="boot-content">
		<!-- Logo -->
		<picture>
			<source srcset="/webtool_logo.webp" type="image/webp" />
			<img
				src="/webtool_logo.png"
				alt="Kosten-Tool Logo"
				width="64"
				height="64"
				class="boot-logo"
			/>
		</picture>

		<!-- Optional: Loading indicator -->
		<div class="boot-spinner" aria-hidden="true">
			<div class="spinner-dot"></div>
			<div class="spinner-dot"></div>
			<div class="spinner-dot"></div>
		</div>

		<!-- Screen reader text -->
		<span class="sr-only">Lädt...</span>
	</div>
</div>

<style>
	/* Container - Full screen overlay */
	.boot-screen {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
		pointer-events: none;
		
		/* Anti-flicker: Only show after 150ms */
		opacity: 0;
		animation: bootFadeIn 200ms 150ms forwards;
	}

	/* Fallback: Auto-hide after 5s if JS fails */
	@keyframes bootFadeIn {
		to {
			opacity: 1;
		}
	}

	/* Content container */
	.boot-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	/* Logo */
	.boot-logo {
		width: 64px;
		height: 64px;
		object-fit: contain;
		animation: logoPulse 1.2s ease-in-out infinite;
	}

	@keyframes logoPulse {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.9;
		}
	}

	/* Spinner - Three dots */
	.boot-spinner {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.spinner-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.8);
		animation: dotBounce 1s ease-in-out infinite;
	}

	.spinner-dot:nth-child(1) {
		animation-delay: 0ms;
	}

	.spinner-dot:nth-child(2) {
		animation-delay: 150ms;
	}

	.spinner-dot:nth-child(3) {
		animation-delay: 300ms;
	}

	@keyframes dotBounce {
		0%, 80%, 100% {
			transform: translateY(0);
			opacity: 0.8;
		}
		40% {
			transform: translateY(-10px);
			opacity: 1;
		}
	}

	/* Screen reader only text */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* Respect reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.boot-screen {
			animation: none;
			opacity: 1;
		}

		.boot-logo,
		.spinner-dot {
			animation: none;
		}

		.boot-logo {
			opacity: 1;
			transform: none;
		}

		.spinner-dot {
			opacity: 0.8;
			transform: none;
		}
	}

	/* Fallback: Auto-remove after 5s */
	.boot-screen {
		animation: bootFadeIn 200ms 150ms forwards, bootFadeOut 300ms 5s forwards;
	}

	@keyframes bootFadeOut {
		to {
			opacity: 0;
			pointer-events: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.boot-screen {
			animation: none;
			opacity: 1;
		}
	}
</style>
