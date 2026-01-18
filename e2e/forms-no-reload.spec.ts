import { test, expect } from '@playwright/test';

/**
 * E2E Tests to verify that form submissions work without full page reloads.
 * These tests document the expected behavior before and after optimization.
 */

test.describe('Forms ohne Page-Reload', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the app (assuming login is handled or not required for tests)
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('Einkommen bearbeiten und speichern ohne Reload', async ({ page }) => {
		// Click edit button for incomes
		await page.click('text=Bearbeiten');
		
		// Find income input fields
		const incomeInputs = page.locator('input[type="number"][id^="income_"]');
		const firstInput = incomeInputs.first();
		
		// Get initial value
		const initialValue = await firstInput.inputValue();
		
		// Change value
		await firstInput.fill('3500');
		
		// Add a marker to detect page reload
		await page.evaluate(() => {
			(window as any).__testMarker = 'no-reload-test';
		});
		
		// Submit form
		await page.click('button[type="submit"]:has-text("Speichern")');
		
		// Wait for action to complete
		await page.waitForTimeout(500);
		
		// Check that page did NOT reload (marker should still exist)
		const markerExists = await page.evaluate(() => {
			return (window as any).__testMarker === 'no-reload-test';
		});
		
		expect(markerExists).toBeTruthy();
		
		// Verify the form is no longer in edit mode
		await expect(page.locator('button:has-text("Bearbeiten")')).toBeVisible();
	});

	test('Neue Kategorie hinzufügen ohne Reload', async ({ page }) => {
		const testCategoryName = `Test-Kategorie-${Date.now()}`;
		
		// Add marker
		await page.evaluate(() => {
			(window as any).__testMarker = 'category-test';
		});
		
		// Fill category name
		await page.fill('input[name="label"][placeholder*="Wohnung"]', testCategoryName);
		
		// Submit
		await page.click('button[type="submit"]:has-text("Kategorie hinzufügen")');
		
		// Wait for action
		await page.waitForTimeout(500);
		
		// Check no reload
		const markerExists = await page.evaluate(() => {
			return (window as any).__testMarker === 'category-test';
		});
		
		expect(markerExists).toBeTruthy();
		
		// Verify category appears
		await expect(page.locator(`h3:has-text("${testCategoryName}")`)).toBeVisible();
	});

	test('Item zu Kategorie hinzufügen ohne Reload', async ({ page }) => {
		// First ensure we have a category
		const categories = page.locator('h3').filter({ hasText: /Wohnung|Versicherungen/ });
		const categoryCount = await categories.count();
		
		if (categoryCount === 0) {
			// Create a test category first
			await page.fill('input[name="label"][placeholder*="Wohnung"]', 'Test-Category');
			await page.click('button[type="submit"]:has-text("Kategorie hinzufügen")');
			await page.waitForTimeout(300);
		}
		
		// Click "Neues Item hinzufügen" for first category
		const addItemButton = page.locator('button:has-text("+ Neues Item hinzufügen")').first();
		await addItemButton.click();
		
		// Fill item form
		await page.fill('input[name="label"][placeholder*="Miete"]', 'Test-Item');
		await page.fill('input[name="amount"][placeholder*="Betrag"]', '150.50');
		
		// Add marker
		await page.evaluate(() => {
			(window as any).__testMarker = 'item-test';
		});
		
		// Submit
		await page.click('button[type="submit"]:has-text("Item hinzufügen")');
		
		// Wait
		await page.waitForTimeout(500);
		
		// Check no reload
		const markerExists = await page.evaluate(() => {
			return (window as any).__testMarker === 'item-test';
		});
		
		expect(markerExists).toBeTruthy();
		
		// Verify item appears
		await expect(page.locator('span.font-medium:has-text("Test-Item")')).toBeVisible();
	});

	test('Item bearbeiten ohne Reload', async ({ page }) => {
		// Assuming there's at least one item, click edit
		const editButtons = page.locator('button:has-text("Bearbeiten")').filter({ 
			has: page.locator('..').filter({ hasNot: page.locator('text=Einkommen') })
		});
		
		const editButtonCount = await editButtons.count();
		if (editButtonCount === 0) {
			test.skip();
			return;
		}
		
		await editButtons.first().click();
		
		// Modify amount
		const amountInput = page.locator('input[name="amount"]').first();
		await amountInput.fill('999.99');
		
		// Add marker
		await page.evaluate(() => {
			(window as any).__testMarker = 'edit-item-test';
		});
		
		// Submit
		await page.click('button[type="submit"]:has-text("Speichern")');
		
		// Wait
		await page.waitForTimeout(500);
		
		// Check no reload
		const markerExists = await page.evaluate(() => {
			return (window as any).__testMarker === 'edit-item-test';
		});
		
		expect(markerExists).toBeTruthy();
	});

	test('Private Ausgabe hinzufügen ohne Reload', async ({ page }) => {
		// Scroll to private expenses section
		await page.locator('h2:has-text("Private Ausgaben")').scrollIntoViewIfNeeded();
		
		// Fill expense form
		await page.fill('input[name="dateISO"]', '2025-01-15');
		await page.fill('input[name="description"]', 'Test-Ausgabe');
		await page.fill('input[name="amount"][step="0.01"]', '42.50');
		
		// Add marker
		await page.evaluate(() => {
			(window as any).__testMarker = 'expense-test';
		});
		
		// Submit
		await page.click('button[type="submit"]:has-text("Ausgabe hinzufügen")');
		
		// Wait
		await page.waitForTimeout(500);
		
		// Check no reload
		const markerExists = await page.evaluate(() => {
			return (window as any).__testMarker === 'expense-test';
		});
		
		expect(markerExists).toBeTruthy();
		
		// Verify expense appears
		await expect(page.locator('text=Test-Ausgabe')).toBeVisible();
	});

	test('Transfer speichern ohne Reload', async ({ page }) => {
		// Scroll to transfer section
		await page.locator('h2:has-text("Überweisung")').scrollIntoViewIfNeeded();
		
		// Fill transfer amount
		const transferInput = page.locator('input[name="totalTransfer"]');
		await transferInput.fill('1500.00');
		
		// Add marker
		await page.evaluate(() => {
			(window as any).__testMarker = 'transfer-test';
		});
		
		// Submit
		await page.click('button[type="submit"]:has-text("Speichern")').last();
		
		// Wait
		await page.waitForTimeout(500);
		
		// Check no reload
		const markerExists = await page.evaluate(() => {
			return (window as any).__testMarker === 'transfer-test';
		});
		
		expect(markerExists).toBeTruthy();
	});

	test('Kategorie löschen ohne Reload', async ({ page }) => {
		// Create a test category to delete
		const testCategory = `Delete-Me-${Date.now()}`;
		await page.fill('input[name="label"][placeholder*="Wohnung"]', testCategory);
		await page.click('button[type="submit"]:has-text("Kategorie hinzufügen")');
		await page.waitForTimeout(500);
		
		// Add marker
		await page.evaluate(() => {
			(window as any).__testMarker = 'delete-cat-test';
		});
		
		// Find and click delete button for this category
		const categoryHeader = page.locator(`h3:has-text("${testCategory}")`).locator('..');
		const deleteButton = categoryHeader.locator('button:has-text("Kategorie löschen")');
		
		// Handle confirmation dialog
		page.on('dialog', dialog => dialog.accept());
		
		await deleteButton.click();
		
		// Wait
		await page.waitForTimeout(500);
		
		// Check no reload
		const markerExists = await page.evaluate(() => {
			return (window as any).__testMarker === 'delete-cat-test';
		});
		
		expect(markerExists).toBeTruthy();
		
		// Verify category is gone
		await expect(page.locator(`h3:has-text("${testCategory}")`)).not.toBeVisible();
	});
});

