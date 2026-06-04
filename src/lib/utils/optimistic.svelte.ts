import { SvelteSet } from 'svelte/reactivity';

/**
 * Reactive overlay layer for optimistic list mutations.
 *
 * Pattern: server-loaded data stays the source of truth; this container holds
 * the transient optimistic delta (locally added items + ids being removed) and
 * merges them over the server list for instant UI feedback. Reconcile/rollback
 * happens in the `use:enhance` callback after the server responds.
 *
 * @typeParam T - List item type, must carry a stable string `id`.
 */
export class OptimisticList<T extends { id: string }> {
	/** Locally added items not yet confirmed by the server (newest first). */
	pending = $state<T[]>([]);
	/** Ids being optimistically removed (server confirmation pending). */
	removing = new SvelteSet<string>();

	/** Insert an optimistic item at the top. */
	add(item: T) {
		this.pending = [item, ...this.pending];
	}

	/** Remove a pending item (reconcile after success, or rollback after add-failure). */
	dropPending(id: string) {
		this.pending = this.pending.filter((p) => p.id !== id);
	}

	/** Optimistically hide an existing item. */
	markRemoving(id: string) {
		this.removing.add(id);
	}

	/** Clear the removing flag (cleanup after success, or rollback after delete-failure). */
	unmarkRemoving(id: string) {
		this.removing.delete(id);
	}

	/**
	 * Merge server items with the optimistic delta: pending items first (newest
	 * on top), then server items, with any `removing` ids filtered out.
	 */
	merge(serverItems: readonly T[]): T[] {
		return [...this.pending, ...serverItems].filter((item) => !this.removing.has(item.id));
	}
}
