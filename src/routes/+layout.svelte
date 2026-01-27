<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { t } from '$lib/copy/index.js';

	const { children } = $props();

	// Check if we're on the login page
	const isLoginPage = $derived($page.url.pathname.startsWith('/login'));

	// Page transition key - changes when route changes
	const pageKey = $derived($page.url.pathname);

	// Service Worker Registration (PWA) - Only in Production
	onMount(async () => {
		// CRITICAL: Only register SW in production, NOT in dev mode
		const isProduction = import.meta.env.PROD;
		
		if (!isProduction) {
			console.log('[PWA] Service Worker disabled in dev mode');
			
			// Unregister any existing service workers in dev mode
			if ('serviceWorker' in navigator) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				for (const registration of registrations) {
					await registration.unregister();
					console.log('[PWA] Unregistered old service worker');
				}
			}
			return;
		}

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/sw.js')
				.then((registration) => {
					console.log('[PWA] Service Worker registered:', registration.scope);

					// Check for updates periodically (every hour)
					setInterval(() => {
						registration.update();
					}, 60 * 60 * 1000);
				})
				.catch((error) => {
					console.error('[PWA] Service Worker registration failed:', error);
				});
		}
	});
</script>

<svelte:head>
	<link rel="manifest" href="/manifest.json" />
	<meta name="theme-color" content="#4f46e5" />
	
	<!-- PWA Meta Tags -->
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="Kosten-Tool" />
	
	<!-- Apple Touch Icons (multiple sizes for iOS) -->
	<link rel="apple-touch-icon" href="/icon-192.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
	<link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
	<link rel="apple-touch-icon" sizes="120x120" href="/icon-192.png" />
	
	<!-- Performance: Preload LCP assets -->
	<link rel="preload" as="image" href="/webtool_logo.webp" type="image/webp" fetchpriority="high" />
</svelte:head>

{#if isLoginPage}
	<!-- Login page: no header, just content -->
	{@render children()}
{:else}
	<!-- App shell with header and main container -->
	<div class="flex min-h-screen flex-col bg-neutral-50">
		<!-- Modern Header with Gradient & Month Info -->
		<header
			class="app-header sticky top-0 z-50 border-b-2 border-primary-300 bg-primary-600 shadow-lg"
		>
			<div class="mx-auto max-w-3xl px-4 py-3">
				<!-- Top Row: App Title & Actions -->
				<div class="mb-2 flex items-center justify-between">
					<!-- App logo (WebP with PNG fallback) -->
					<a href="/" class="flex items-center transition-opacity hover:opacity-80 active:scale-95">
						<picture>
							<source srcset="/webtool_logo.webp" type="image/webp" />
							<img 
								src="/webtool_logo.png" 
								alt={t('aria.appLogo')}
								width="64"
								height="64"
								class="h-16 w-auto"
								loading="eager"
								fetchpriority="high"
							/>
						</picture>
					</a>

					<!-- Action buttons -->
					<div class="flex items-center gap-2">
					<!-- Archive button -->
					<a
						href="/archiv"
						class="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
						aria-label={t('aria.archive')}
						data-sveltekit-preload-code="off"
					>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
							</svg>
							<span>{t('nav.archive')}</span>
						</a>
						
						<!-- Logout button -->
						<a
							href="/logout"
							class="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
							<span>{t('nav.logout')}</span>
						</a>
					</div>
				</div>
			</div>
		</header>

		<main class="app-main flex-1">
			<div class="mx-auto w-full max-w-3xl px-4 py-6">
				<div class="page-transition-container">
					{#key pageKey}
						<div class="page-content">
							{@render children()}
						</div>
					{/key}
				</div>
			</div>
		</main>

		<!-- Bottom Navigation -->
		<BottomNav />
	</div>
{/if}

<style>
	/* Ultra-fast smooth crossfade using CSS */
	.page-transition-container {
		position: relative;
		min-height: 50vh;
	}

	.page-content {
		animation: pageIn 0.15s cubic-bezier(0.4, 0, 0.2, 1);
	}

	@keyframes pageIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Smooth out the transition */
	@media (prefers-reduced-motion: no-preference) {
		.page-content {
			will-change: opacity, transform;
		}
	}	/* Disable animations for users who prefer reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.page-content {
			animation: none;
		}
	}
</style>
