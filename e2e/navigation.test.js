import { expect, test } from '@playwright/test';

test.describe('navigation', () => {
	test('user can reach help center from the header', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: 'Help' }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Help Center' })).toBeVisible();
	});

	test('login form validates role selection before submitting', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel('PIN').fill('1234');
		await page.getByRole('button', { name: 'Login' }).click();
		await expect(page.getByRole('alert')).toHaveText('Please select your role');
	});
});

