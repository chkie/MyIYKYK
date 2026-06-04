<script lang="ts">
	import { confirmController as c } from '$lib/utils/confirm.svelte.js';
	import { hapticImpact, hapticSelection } from '$lib/utils/haptics.js';

	let dialogEl = $state<HTMLDialogElement | null>(null);

	// Controller-State ↔ <dialog> synchronisieren.
	$effect(() => {
		if (!dialogEl) return;
		if (c.open && !dialogEl.open) dialogEl.showModal();
		else if (!c.open && dialogEl.open) dialogEl.close();
	});

	function onConfirm() {
		if (c.options?.danger) hapticImpact();
		else hapticSelection();
		c.confirm();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="confirm-sheet"
	aria-labelledby={c.options?.title ? 'confirm-sheet-title' : 'confirm-sheet-message'}
	aria-describedby="confirm-sheet-message"
	onclose={() => c.cancel()}
	onclick={(e) => {
		// Tap auf Backdrop (das <dialog> selbst, nicht der innere Karton) schließt.
		if (e.target === dialogEl) c.cancel();
	}}
>
	{#if c.options}
		<div class="confirm-sheet__panel">
			{#if c.options.title}
				<h2 id="confirm-sheet-title" class="confirm-sheet__title">{c.options.title}</h2>
			{/if}
			<p id="confirm-sheet-message" class="confirm-sheet__message">{c.options.message}</p>
			<div class="confirm-sheet__actions">
				<button
					type="button"
					class="confirm-sheet__btn confirm-sheet__btn--confirm"
					class:confirm-sheet__btn--danger={c.options.danger}
					onclick={onConfirm}
				>
					{c.options.confirmLabel ?? (c.options.danger ? 'Löschen' : 'Bestätigen')}
				</button>
				<button
					type="button"
					class="confirm-sheet__btn confirm-sheet__btn--cancel"
					onclick={() => c.cancel()}
				>
					{c.options.cancelLabel ?? 'Abbrechen'}
				</button>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.confirm-sheet {
		position: fixed;
		inset: 0;
		max-width: none;
		max-height: none;
		width: 100%;
		height: 100%;
		background: transparent;
		border: none;
		padding: 0;
	}
	.confirm-sheet::backdrop {
		background: rgb(0 0 0 / 0.4);
	}
	.confirm-sheet__panel {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		margin: 0 auto;
		max-width: 32rem;
		background: #fff;
		border-radius: 1.25rem 1.25rem 0 0;
		padding: 1.5rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom));
		box-shadow: 0 -8px 40px rgb(0 0 0 / 0.18);
	}
	.confirm-sheet__title {
		font-size: 1.125rem;
		font-weight: 700;
		color: #171717;
		margin-bottom: 0.5rem;
	}
	.confirm-sheet__message {
		font-size: 1rem;
		color: #404040;
		margin-bottom: 1.25rem;
		line-height: 1.5;
	}
	.confirm-sheet__actions {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
	.confirm-sheet__btn {
		width: 100%;
		border-radius: 0.875rem;
		padding: 0.875rem 1rem;
		font-size: 1rem;
		font-weight: 600;
		transition:
			transform 0.1s ease,
			background-color 0.15s ease;
	}
	.confirm-sheet__btn:active {
		transform: scale(0.97);
	}
	.confirm-sheet__btn--confirm {
		background: #4f46e5;
		color: #fff;
	}
	.confirm-sheet__btn--danger {
		background: #dc2626;
		color: #fff;
	}
	.confirm-sheet__btn--cancel {
		background: #f5f5f5;
		color: #404040;
	}

	/* Slide-up-Animation — respektiert prefers-reduced-motion. */
	@media (prefers-reduced-motion: no-preference) {
		.confirm-sheet[open] .confirm-sheet__panel {
			animation: confirm-slide-up 0.22s cubic-bezier(0.32, 0.72, 0, 1);
		}
		.confirm-sheet[open]::backdrop {
			animation: confirm-fade-in 0.22s ease;
		}
	}
	@keyframes confirm-slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	@keyframes confirm-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
