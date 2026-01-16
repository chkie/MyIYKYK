<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';

	const { children } = $props();

	// Check if we're on the login page
	const isLoginPage = $derived($page.url.pathname.startsWith('/login'));
</script>

{#if isLoginPage}
	<!-- Login page: no header, just content -->
	{@render children()}
{:else}
	<!-- App shell with header and main container -->
	<div class="min-h-screen flex flex-col">
		<header class="border-b border-gray-200 bg-white">
			<div class="mx-auto max-w-screen-md px-4 py-4">
				<div class="flex items-center justify-between">
					<!-- App name -->
					<h1 class="text-xl font-semibold text-gray-900">Kosten-Tool</h1>

					<!-- Logout link -->
					<a
						href="/logout"
						class="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
					>
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
	</div>
{/if}

