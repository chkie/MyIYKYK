<script lang="ts">
	import { profileStore } from '$lib/stores/profile.svelte';
	import { t } from '$lib/copy/index.js';
	import { fade } from 'svelte/transition';
	
	interface Profile {
		id: string;
		name: string;
		role: string;
	}
	
	let { profiles, onSelect }: { profiles: Profile[], onSelect?: () => void } = $props();
	
	function selectProfile(profile: Profile) {
		profileStore.setProfile(profile.id, profile.name);
		onSelect?.();
	}
</script>

<div 
	transition:fade={{ duration: 200 }}
	class="fixed inset-0 z-9999 flex items-center justify-center bg-linear-to-br from-primary-500 to-primary-700 p-6" 
	style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); opacity: 1;"
>
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style="background: rgba(255, 255, 255, 0.25);">
				<svg class="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
			</div>
			<h1 class="text-3xl font-bold text-white">{t('profileSelector.welcome')}</h1>
			<p class="mt-2 text-lg text-white/90">{t('profileSelector.whoIsUsing')}</p>
		</div>

		<!-- Profile Cards -->
		<div class="space-y-3">
			{#each profiles as profile}
				<button
					onclick={() => selectProfile(profile)}
					class="group w-full overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all hover:scale-105 hover:shadow-2xl active:scale-100"
				>
					<div class="flex items-center gap-4">
						<!-- Avatar -->
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary-400 to-primary-600 text-white transition-transform group-hover:scale-110">
							<span class="text-2xl font-bold">{profile.name[0]}</span>
						</div>
						
						<!-- Info -->
						<div class="flex-1 text-left">
							<p class="text-xl font-bold text-neutral-900">{profile.name}</p>
							<!-- Removed role label - equal users -->
						</div>
						
						<!-- Arrow -->
						<svg class="h-6 w-6 text-primary-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</button>
			{/each}
		</div>

		<!-- Footer -->
		<p class="mt-6 text-center text-sm text-white/70">
			{t('profileSelector.savedOnDevice')}
		</p>
	</div>
</div>
