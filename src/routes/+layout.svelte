<script lang="ts">
	import '../routes/layout.css';
	import type { LayoutData } from './$types.js';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ProfileSelector from '$lib/components/ProfileSelector.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import { askConfirm } from '$lib/utils/confirm.svelte.js';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { page, navigating } from '$app/stores';
	import { onNavigate } from '$app/navigation';
	import { browser, dev } from '$app/environment';
	import { onMount, type Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Service-Worker-Update-Flow: Toast anzeigen, wenn eine neue Version wartet
	let updateReady = $state(false);
	let waitingWorker: ServiceWorker | null = null;

	function applyUpdate() {
		updateReady = false;
		// SW übernimmt nach SKIP_WAITING → controllerchange triggert Reload
		(waitingWorker ?? navigator.serviceWorker.controller)?.postMessage('SKIP_WAITING');
	}

	// Register Service Worker (only in production)
	onMount(() => {
		if (browser && import.meta.env.PROD && 'serviceWorker' in navigator) {
			let refreshing = false;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (refreshing) return;
				refreshing = true;
				window.location.reload();
			});

			navigator.serviceWorker
				.register('/sw.js')
				.then((registration) => {
					console.log('SW registered:', registration.scope);
					// Falls beim Laden bereits ein neuer SW wartet
					if (registration.waiting && navigator.serviceWorker.controller) {
						waitingWorker = registration.waiting;
						updateReady = true;
					}
					registration.addEventListener('updatefound', () => {
						const nw = registration.installing;
						nw?.addEventListener('statechange', () => {
							if (nw.state === 'installed' && navigator.serviceWorker.controller) {
								waitingWorker = registration.waiting;
								updateReady = true;
							}
						});
					});
				})
				.catch((error) => {
					console.warn('SW registration failed:', error);
				});
		}
	});

	// Cross-Fade zwischen Seiten via View Transitions (Browser-Support vorausgesetzt)
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Check if we're on login page - SSR safe
	let currentPath = $derived($page.url.pathname);
	let isLoginPage = $derived(currentPath === '/login');

	// Show profile selector ONLY if:
	// 1. User is authenticated (after login)
	// 2. Client-side (browser)
	// 3. No profile selected yet
	// 4. Not on login page
	// 5. Profiles are loaded
	let showProfileSelector = $derived(
		browser &&
			data.isAuthenticated && // ← NEW: Only after login!
			profileStore.isInitialized &&
			!profileStore.hasProfile &&
			!isLoginPage &&
			data?.profiles?.length > 0
	);

	// 🔍 DEBUG: Log all conditions
	$effect(() => {
		if (browser && dev) {
			console.log('=== ProfileSelector Conditions ===');
			console.log('browser:', browser);
			console.log('isAuthenticated:', data.isAuthenticated);
			console.log('isInitialized:', profileStore.isInitialized);
			console.log('hasProfile:', profileStore.hasProfile);
			console.log('isLoginPage:', isLoginPage);
			console.log('profiles.length:', data?.profiles?.length);
			console.log('→ showProfileSelector:', showProfileSelector);
			console.log('localStorage:', localStorage.getItem('myiykyk_profile'));
		}
	});

	// Always show nav except on login page
	let showNav = $derived(!isLoginPage);
</script>

<svelte:head>
	<meta name="theme-color" content="#4f46e5" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-neutral-50">
	<!-- Navigations-Fortschrittsbalken (beseitigt "dead tap"-Gefühl) -->
	{#if $navigating}
		<div class="nav-progress" role="status" aria-label="Seite wird geladen"></div>
	{/if}

	<!-- Profile Selector Overlay (only client-side) -->
	{#if showProfileSelector && data?.profiles}
		<ProfileSelector profiles={data.profiles} />
	{:else}
		<!-- Only show content when profile is selected or on login page -->
		<!-- Top Header (only if not login page) -->
		{#if !isLoginPage}
			<header
				class="app-header border-primary-300 bg-primary-600 sticky top-0 z-50 border-b-2 shadow-lg"
			>
				<div class="mx-auto max-w-3xl px-4 py-3">
					<!-- Top Row: App Title & Actions -->
					<div class="mb-2 flex items-center justify-between">
						<!-- App logo (WebP with PNG fallback) -->
						<a
							href="/"
							class="flex items-center transition-opacity hover:opacity-80 active:scale-95"
						>
							<picture>
								<source srcset="/webtool_logo.webp" type="image/webp" />
								<img
									src="/webtool_logo.png"
									alt="Kosten-Tool Logo"
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
								aria-label="Archiv"
								data-sveltekit-preload-code="viewport"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
									/>
								</svg>
								<span>Archiv</span>
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
								<span>Logout</span>
							</a>
						</div>
					</div>
				</div>
			</header>
		{/if}

		<!-- Main Content with Bottom Padding for Nav -->
		<main class="app-main flex-1">
			<div class="mx-auto max-w-2xl px-4 py-6">
				{@render children()}
			</div>
		</main>

		<!-- Bottom Navigation - Always show except on login -->
		{#if showNav}
			<BottomNav />
		{/if}

		<!-- Service-Worker-Update verfügbar -->
		{#if updateReady}
			<div class="sw-update-toast" role="status" aria-live="polite">
				<span class="sw-update-toast__text">Update verfügbar</span>
				<button type="button" class="sw-update-toast__btn" onclick={applyUpdate}>
					Neu laden
				</button>
			</div>
		{/if}

		<!-- 🔧 DEBUG: Floating Reset Button (TEMPORARY - Remove in production) -->
		{#if browser && dev}
			<button
				onclick={async () => {
					if (
						await askConfirm({
							message: '🔧 DEBUG: localStorage + Cookie löschen und neu laden?',
							danger: true
						})
					) {
						// Clear localStorage (profile)
						localStorage.removeItem('myiykyk_profile');
						// Clear auth cookie (logout)
						document.cookie = 'auth=; Max-Age=0; path=/; SameSite=Lax';
						// Wait a bit for cookie deletion, then reload
						setTimeout(() => {
							window.location.href = '/login';
						}, 100);
					}
				}}
				type="button"
				class="bg-warning-500 hover:bg-warning-600 fixed right-4 bottom-24 z-9998 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
				title="DEBUG: Reset Profile + Logout"
			>
				🔧
			</button>
		{/if}
	{/if}

	<!-- Globales Bestätigungs-Sheet (Ersatz für window.confirm) -->
	<ConfirmSheet />
</div>
