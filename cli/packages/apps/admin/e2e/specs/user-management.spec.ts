/**
 * Admin App E2E Tests - User Management
 *
 * Tests for user CRUD operations in the admin dashboard.
 */

import { test, expect } from '@playwright/test';
import { LoginPage, UserManagementPage } from '@lazarus-life/shared/test/e2e/PageObjectModel';
import { TEST_USERS } from '@lazarus-life/shared/test/fixtures/seedData';

test.describe('User Management', () => {
  let loginPage: LoginPage;
  let userManagementPage: UserManagementPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    userManagementPage = new UserManagementPage(page);

    // Login as admin
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.email, 'testpassword123');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test('should display user list', async () => {
    await userManagementPage.goto();

    // Verify test users are visible
    await userManagementPage.expectUserInList(TEST_USERS.admin.email);
    await userManagementPage.expectUserInList(TEST_USERS.doctor.email);
  });

  test('should search for user', async () => {
    await userManagementPage.goto();

    // Search for doctor
    await userManagementPage.searchUser(TEST_USERS.doctor.email);

    // Verify only doctor is visible
    await userManagementPage.expectUserInList(TEST_USERS.doctor.email);
  });

  test('should create new user', async ({ page }) => {
    await userManagementPage.goto();

    // Click add user button
    await userManagementPage.clickAddUser();

    // Fill in user form
    const newUserEmail = `newuser-${Date.now()}@test.com`;
    await page.fill('input[name="email"]', newUserEmail);
    await page.fill('input[name="username"]', `newuser_${Date.now()}`);
    await page.selectOption('select[name="role"]', 'user');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify user appears in list
    await userManagementPage.expectUserInList(newUserEmail);
  });

  test('should edit existing user', async ({ page }) => {
    await userManagementPage.goto();

    // Find and click edit button for doctor
    const doctorRow = page.locator(`tr:has-text("${TEST_USERS.doctor.email}")`);
    const editButton = doctorRow.locator('button:has-text("Edit"), [aria-label="Edit"]');
    await editButton.click();

    // Wait for edit form
    await page.waitForSelector('form, [role="dialog"]');

    // Update username
    const newUsername = `dr_smith_updated_${Date.now()}`;
    await page.fill('input[name="username"]', newUsername);

    // Submit form
    await page.click('button:has-text("Save"), button[type="submit"]');

    // Verify update succeeded (should show success message or updated data)
    await expect(page.locator('[role="alert"], .success-message')).toBeVisible();
  });

  test('should delete user', async ({ page }) => {
    await userManagementPage.goto();

    // Create a temporary user to delete
    await userManagementPage.clickAddUser();
    const tempUserEmail = `temp-${Date.now()}@test.com`;
    await page.fill('input[name="email"]', tempUserEmail);
    await page.fill('input[name="username"]', `tempuser_${Date.now()}`);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');

    // Wait for user to appear
    await userManagementPage.expectUserInList(tempUserEmail);

    // Delete the user
    await userManagementPage.deleteUser(tempUserEmail);

    // Verify user is removed from list
    await expect(page.locator(`tr:has-text("${tempUserEmail}")`)).not.toBeVisible();
  });

  test('should display user roles correctly', async ({ page }) => {
    await userManagementPage.goto();

    // Verify admin user has admin role
    const adminRow = page.locator(`tr:has-text("${TEST_USERS.admin.email}")`);
    await expect(adminRow.locator('text=admin, text=Admin')).toBeVisible();

    // Verify doctor has provider role
    const doctorRow = page.locator(`tr:has-text("${TEST_USERS.doctor.email}")`);
    await expect(doctorRow.locator('text=provider, text=Provider')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await userManagementPage.goto();
    await userManagementPage.clickAddUser();

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Verify validation errors are shown
    await expect(page.locator('[role="alert"], .error-message')).toBeVisible();
  });

  test('should prevent duplicate email', async ({ page }) => {
    await userManagementPage.goto();
    await userManagementPage.clickAddUser();

    // Try to create user with existing email
    await page.fill('input[name="email"]', TEST_USERS.admin.email);
    await page.fill('input[name="username"]', `duplicate_${Date.now()}`);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');

    // Verify error message about duplicate email
    await expect(page.locator('[role="alert"]:has-text("email"), [role="alert"]:has-text("exists")')).toBeVisible();
  });
});
