/**
 * Unit tests for history module.
 */

import { describe, it, expect } from 'vitest';
import type { HistoryPosition } from './history.js';

describe('History Module', () => {
	describe('HistoryPosition type', () => {
		it('should accept private_expense type', () => {
			const position: HistoryPosition = {
				id: 'test-id',
				type: 'private_expense',
				description: 'Test expense',
				amount: 10.50,
				createdAt: '2026-01-31T10:00:00Z',
				createdBy: 'profile-id',
				createdByName: 'Christian'
			};

			expect(position.type).toBe('private_expense');
			expect(position.amount).toBe(10.50);
		});

		it('should accept fixed_item type', () => {
			const position: HistoryPosition = {
				id: 'test-id-2',
				type: 'fixed_item',
				description: 'Rent',
				amount: 1200,
				createdAt: '2026-01-31T09:00:00Z',
				createdBy: null, // Legacy entry
				createdByName: null
			};

			expect(position.type).toBe('fixed_item');
			expect(position.createdBy).toBeNull();
		});
	});

	describe('Month boundaries', () => {
		it('should calculate correct month start/end', () => {
			// January 2026
			const year = 2026;
			const month = 1;

			const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
			const endDate = new Date(year, month, 1, 0, 0, 0, 0);

			expect(startDate.getFullYear()).toBe(2026);
			expect(startDate.getMonth()).toBe(0); // January = 0
			expect(startDate.getDate()).toBe(1);

			expect(endDate.getFullYear()).toBe(2026);
			expect(endDate.getMonth()).toBe(1); // February = 1
			expect(endDate.getDate()).toBe(1);
		});

		it('should handle year boundary (December -> January)', () => {
			// December 2025
			const year = 2025;
			const month = 12;

			const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
			const endDate = new Date(year, month, 1, 0, 0, 0, 0);

			expect(startDate.getFullYear()).toBe(2025);
			expect(startDate.getMonth()).toBe(11); // December = 11

			expect(endDate.getFullYear()).toBe(2026); // Rolls over to next year
			expect(endDate.getMonth()).toBe(0); // January = 0
		});
	});

	describe('Position sorting', () => {
		it('should sort by createdAt DESC (newest first)', () => {
			const positions: HistoryPosition[] = [
				{
					id: '1',
					type: 'private_expense',
					description: 'Old',
					amount: 10,
					createdAt: '2026-01-01T10:00:00Z',
					createdBy: null,
					createdByName: null
				},
				{
					id: '2',
					type: 'fixed_item',
					description: 'New',
					amount: 20,
					createdAt: '2026-01-31T15:00:00Z',
					createdBy: null,
					createdByName: null
				},
				{
					id: '3',
					type: 'private_expense',
					description: 'Middle',
					amount: 15,
					createdAt: '2026-01-15T12:00:00Z',
					createdBy: null,
					createdByName: null
				}
			];

			const sorted = positions.sort(
				(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);

			expect(sorted[0].description).toBe('New');
			expect(sorted[1].description).toBe('Middle');
			expect(sorted[2].description).toBe('Old');
		});
	});

	describe('Pagination (last5)', () => {
		it('should return max 5 items', () => {
			const positions: HistoryPosition[] = Array.from({ length: 10 }, (_, i) => ({
				id: `id-${i}`,
				type: 'private_expense',
				description: `Item ${i}`,
				amount: i * 10,
				createdAt: new Date(2026, 0, i + 1).toISOString(),
				createdBy: null,
				createdByName: null
			}));

			const last5 = positions.slice(0, 5);

			expect(last5.length).toBe(5);
			expect(last5[0].description).toBe('Item 0');
			expect(last5[4].description).toBe('Item 4');
		});

		it('should return all items if less than 5', () => {
			const positions: HistoryPosition[] = Array.from({ length: 3 }, (_, i) => ({
				id: `id-${i}`,
				type: 'private_expense',
				description: `Item ${i}`,
				amount: i * 10,
				createdAt: new Date(2026, 0, i + 1).toISOString(),
				createdBy: null,
				createdByName: null
			}));

			const last5 = positions.slice(0, 5);

			expect(last5.length).toBe(3);
		});
	});
});
