import { describe, expect, it } from 'vitest';
import { confirmController, askConfirm } from './confirm.svelte.ts';

describe('confirmController', () => {
	it('resolves true when confirmed', async () => {
		const p = askConfirm({ message: 'X?' });
		expect(confirmController.open).toBe(true);
		confirmController.confirm();
		expect(confirmController.open).toBe(false);
		await expect(p).resolves.toBe(true);
	});

	it('resolves false when cancelled', async () => {
		const p = askConfirm({ message: 'X?' });
		confirmController.cancel();
		await expect(p).resolves.toBe(false);
	});

	it('stores the passed options', () => {
		askConfirm({ message: 'Löschen?', danger: true, confirmLabel: 'Weg damit' });
		expect(confirmController.options?.message).toBe('Löschen?');
		expect(confirmController.options?.danger).toBe(true);
		confirmController.cancel();
	});

	it('cancels a previously open dialog when a new ask comes in', async () => {
		const first = askConfirm({ message: 'A?' });
		const second = askConfirm({ message: 'B?' });
		await expect(first).resolves.toBe(false); // altes wird abgebrochen
		expect(confirmController.options?.message).toBe('B?');
		confirmController.confirm();
		await expect(second).resolves.toBe(true);
	});

	it('is idempotent on double settle', async () => {
		const p = askConfirm({ message: 'X?' });
		confirmController.confirm();
		confirmController.cancel(); // no-op, Promise schon resolved
		await expect(p).resolves.toBe(true);
	});
});
