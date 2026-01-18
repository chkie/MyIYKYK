<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import BottomNav from '$lib/components/BottomNav.svelte';

	const { children } = $props();

	// Check if we're on the login page
	const isLoginPage = $derived($page.url.pathname.startsWith('/login'));
</script>

{#if isLoginPage}
	<!-- Login page: no header, just content -->
	{@render children()}
{:else}
	<!-- App shell with header and main container -->
	<div class="min-h-screen flex flex-col bg-neutral-50">
		<!-- Modern Header with Gradient & Month Info -->
		<header class="sticky top-0 z-50 border-b border-primary-200 bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg">
			<div class="mx-auto max-w-screen-md px-4 py-3">
				<!-- Top Row: App Title & Logout -->
				<div class="flex items-center justify-between mb-2">
					<!-- App name with icon -->
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
							<span class="text-2xl">💰</span>
						</div>
						<h1 class="text-xl font-bold text-white">Kosten-Tool</h1>
					</div>

					<!-- Logout button -->
					<a
						href="/logout"
						class="inline-flex items-center rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
					>
						<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						Logout
					</a>
				</div>
			</div>
		</header>

		<main class="flex-1">
			<div class="mx-auto w-full max-w-screen-md px-4 py-6">
				{@render children()}
			</div>
		</main>

		<!-- Bottom Navigation -->
		<BottomNav />
	</div>
{/if}

