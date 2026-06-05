import { describe, expect, it } from 'vitest';
import { OptimisticList } from './optimistic.svelte.ts';

type Item = { id: string; label: string; pending?: boolean };

const server: Item[] = [
	{ id: 's1', label: 'Server 1' },
	{ id: 's2', label: 'Server 2' }
];

describe('OptimisticList', () => {
	it('merge returns server items untouched when no delta', () => {
		const list = new OptimisticList<Item>();
		expect(list.merge(server).map((i) => i.id)).toEqual(['s1', 's2']);
	});

	it('add inserts the optimistic item first (instant add)', () => {
		const list = new OptimisticList<Item>();
		list.add({ id: 'tmp', label: 'New', pending: true });
		const merged = list.merge(server);
		expect(merged.map((i) => i.id)).toEqual(['tmp', 's1', 's2']);
		expect(merged[0].pending).toBe(true);
	});

	it('dropPending removes the optimistic item (add rollback / reconcile)', () => {
		const list = new OptimisticList<Item>();
		list.add({ id: 'tmp', label: 'New', pending: true });
		list.dropPending('tmp');
		expect(list.merge(server).map((i) => i.id)).toEqual(['s1', 's2']);
	});

	it('markRemoving hides the item immediately (instant delete)', () => {
		const list = new OptimisticList<Item>();
		list.markRemoving('s1');
		expect(list.merge(server).map((i) => i.id)).toEqual(['s2']);
	});

	it('unmarkRemoving brings the item back (delete rollback)', () => {
		const list = new OptimisticList<Item>();
		list.markRemoving('s1');
		list.unmarkRemoving('s1');
		expect(list.merge(server).map((i) => i.id)).toEqual(['s1', 's2']);
	});

	it('combines pending add and removing in one merge', () => {
		const list = new OptimisticList<Item>();
		list.add({ id: 'tmp', label: 'New', pending: true });
		list.markRemoving('s1');
		expect(list.merge(server).map((i) => i.id)).toEqual(['tmp', 's2']);
	});
});
