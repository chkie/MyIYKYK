<script lang="ts">
	import { page } from '$app/stores';
	import { hapticSelection } from '../utils/haptics';

	// Navigation items
	const navItems = [
		{
			href: '/',
			icon: 'overview',
			label: 'Übersicht',
			activePattern: /^\/$/
		},
		{
			href: '/fixkosten',
			icon: 'home',
			label: 'Fixkosten',
			activePattern: /^\/fixkosten/
		},
		{
			href: '/ausgaben',
			icon: 'money',
			label: 'Ausgaben',
			activePattern: /^\/ausgaben/
		},
		{
			href: '/profil',
			icon: 'user',
			label: 'Profil',
			activePattern: /^\/profil/
		}
	];

	// Check if nav item is active
	function isActive(pattern: RegExp): boolean {
		return pattern.test($page.url.pathname);
	}

	// SVG Icons
	const icons: Record<string, string> = {
		overview: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />`,
		home: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />`,
		money: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />`,
		user: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />`
	};
</script>

<!-- Bottom Navigation - Fixed at bottom with safe area -->
<nav class="fixed bottom-0 left-0 right-0 z-9999 border-t-2 border-primary-200 bg-primary-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
	<div class="mx-auto max-w-3xl">
		<div class="grid grid-cols-4">
			{#each navItems as item}
				<a
					href={item.href}
					class="group flex flex-col items-center gap-1 px-2 py-3 transition-all active:scale-95 {isActive(item.activePattern)
						? 'text-primary-600'
						: 'text-neutral-500 hover:text-neutral-700'}"
					data-sveltekit-preload-data="tap"
					data-sveltekit-noscroll
					onclick={() => hapticSelection()}
				>
					<!-- Icon -->
					<div class="relative">
						<svg
							class="h-6 w-6 transition-transform {isActive(item.activePattern) ? 'scale-110' : 'group-hover:scale-105'}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							{@html icons[item.icon]}
						</svg>
						
						<!-- Active indicator dot -->
						{#if isActive(item.activePattern)}
							<div class="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-600"></div>
						{/if}
					</div>

					<!-- Label -->
					<span class="text-xs font-medium {isActive(item.activePattern) ? 'font-bold' : ''}">
						{item.label}
					</span>
				</a>
			{/each}
		</div>
	</div>
</nav>

<style>
	nav {
		/* Safe area support for iOS */
		padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
	}
</style>

