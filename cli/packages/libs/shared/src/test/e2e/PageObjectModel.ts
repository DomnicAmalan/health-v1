/**
 * Page Object Model (POM) for E2E Testing
 *
 * Provides reusable page objects for Playwright E2E tests.
 * Encapsulates page interactions and element selectors.
 *
 * Usage:
 *   const loginPage = new LoginPage(page);
 *   await loginPage.goto();
 *   await loginPage.login('user@test.com', 'password');
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Base Page Object
 *
 * Provides common functionality for all page objects.
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  /**
   * Check if element exists
   */
  async exists(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    return (await element.count()) > 0;
  }
}

/**
 * Login Page
 */
export class LoginPage extends BasePage {
  // Selectors
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name="email"], input[type="email"]');
    this.passwordInput = page.locator('input[name="password"], input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"], .error-message');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.waitForLoad();
  }

  /**
   * Perform login
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Expect login error
   */
  async expectError(message: string) {
    await this.errorMessage.waitFor({ state: 'visible' });
    const errorText = await this.errorMessage.textContent();
    if (!errorText?.includes(message)) {
      throw new Error(`Expected error "${message}" but got "${errorText}"`);
    }
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible(): Promise<boolean> {
    return this.emailInput.isVisible();
  }
}

/**
 * Dashboard Page
 */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.waitForLoad();
  }

  /**
   * Check if user is logged in (dashboard visible)
   */
  async isLoggedIn(): Promise<boolean> {
    return this.exists('[data-testid="dashboard"], h1:has-text("Dashboard")');
  }

  /**
   * Logout
   */
  async logout() {
    const logoutButton = this.page.locator('button:has-text("Logout"), [data-testid="logout"]');
    await logoutButton.click();
    await this.page.waitForURL('/login');
  }
}

/**
 * Patient List Page
 */
export class PatientListPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly addPatientButton: Locator;
  private readonly patientTable: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[placeholder*="Search"], input[name="search"]');
    this.addPatientButton = page.locator('button:has-text("Add Patient"), [data-testid="add-patient"]');
    this.patientTable = page.locator('table, [role="table"]');
  }

  /**
   * Navigate to patient list
   */
  async goto() {
    await this.page.goto('/patients');
    await this.waitForLoad();
  }

  /**
   * Search for patient
   */
  async searchPatient(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForLoad();
  }

  /**
   * Expect patient in list
   */
  async expectPatientInList(identifier: string) {
    const patientRow = this.page.locator(`tr:has-text("${identifier}")`);
    await patientRow.waitFor({ state: 'visible' });
  }

  /**
   * Click add patient button
   */
  async clickAddPatient() {
    await this.addPatientButton.click();
  }

  /**
   * Get patient count
   */
  async getPatientCount(): Promise<number> {
    const rows = await this.patientTable.locator('tbody tr').count();
    return rows;
  }

  /**
   * Select patient by MRN
   */
  async selectPatientByMRN(mrn: string) {
    const patientRow = this.page.locator(`tr:has-text("${mrn}")`);
    await patientRow.click();
  }
}

/**
 * Patient Detail Page
 */
export class PatientDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to patient detail
   */
  async goto(patientId: string) {
    await this.page.goto(`/patients/${patientId}`);
    await this.waitForLoad();
  }

  /**
   * Get patient name
   */
  async getPatientName(): Promise<string> {
    const nameElement = this.page.locator('h1, [data-testid="patient-name"]');
    return (await nameElement.textContent()) || '';
  }

  /**
   * Schedule appointment
   */
  async scheduleAppointment() {
    const scheduleButton = this.page.locator('button:has-text("Schedule"), [data-testid="schedule-appointment"]');
    await scheduleButton.click();
  }

  /**
   * View medical records
   */
  async viewMedicalRecords() {
    const recordsTab = this.page.locator('button:has-text("Medical Records"), [role="tab"]:has-text("Medical Records")');
    await recordsTab.click();
    await this.waitForLoad();
  }
}

/**
 * User Management Page (Admin)
 */
export class UserManagementPage extends BasePage {
  private readonly addUserButton: Locator;
  private readonly userTable: Locator;

  constructor(page: Page) {
    super(page);
    this.addUserButton = page.locator('button:has-text("Add User"), [data-testid="add-user"]');
    this.userTable = page.locator('table, [role="table"]');
  }

  /**
   * Navigate to user management
   */
  async goto() {
    await this.page.goto('/admin/users');
    await this.waitForLoad();
  }

  /**
   * Click add user
   */
  async clickAddUser() {
    await this.addUserButton.click();
  }

  /**
   * Search for user
   */
  async searchUser(email: string) {
    const searchInput = this.page.locator('input[placeholder*="Search"]');
    await searchInput.fill(email);
    await searchInput.press('Enter');
    await this.waitForLoad();
  }

  /**
   * Expect user in list
   */
  async expectUserInList(email: string) {
    const userRow = this.page.locator(`tr:has-text("${email}")`);
    await userRow.waitFor({ state: 'visible' });
  }

  /**
   * Delete user
   */
  async deleteUser(email: string) {
    const userRow = this.page.locator(`tr:has-text("${email}")`);
    const deleteButton = userRow.locator('button:has-text("Delete"), [aria-label="Delete"]');
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Delete")');
    await confirmButton.click();
    await this.waitForLoad();
  }
}

/**
 * Export all page objects
 */
export const PageObjects = {
  LoginPage,
  DashboardPage,
  PatientListPage,
  PatientDetailPage,
  UserManagementPage,
};
