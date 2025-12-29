import { Page, expect } from '@playwright/test'

// Test data generation
export function generateTestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

export function generateTestEmail(): string {
  return `e2e_${generateTestId()}@test.com`
}

// Login helper
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 })
}

// Register and login helper
export async function registerAndLogin(page: Page): Promise<{ email: string; password: string }> {
  const email = generateTestEmail()
  const password = 'TestPassword123!'
  const name = 'E2E Test User'
  const company = 'E2E Test Company'

  await page.goto('/signup')

  // Fill required fields
  await page.locator('#name').fill(name)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)

  // Fill optional org name if visible
  const orgField = page.locator('#orgName')
  if (await orgField.isVisible()) {
    await orgField.fill(company)
  }

  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 })

  return { email, password }
}

// Navigation helpers
export async function navigateTo(page: Page, path: string, linkText?: string | RegExp) {
  if (linkText) {
    // Try to click sidebar link first
    const link = page.getByRole('link', { name: linkText })
    if (await link.isVisible()) {
      await link.click()
      await expect(page).toHaveURL(new RegExp(path), { timeout: 5000 })
      return
    }
  }
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

// Wait for table to load
export async function waitForTableLoad(page: Page, timeout = 10000) {
  // Wait for either table rows or empty state
  await Promise.race([
    page.locator('table tbody tr').first().waitFor({ timeout }),
    page.getByText(/no .* found|empty|no data|no results/i).waitFor({ timeout }),
  ]).catch(() => {})
}

// Form helpers
export async function fillFormField(page: Page, label: string | RegExp, value: string) {
  const field = page.getByLabel(label)
  await field.fill(value)
}

export async function selectOption(page: Page, label: string | RegExp, optionText: string) {
  const select = page.getByLabel(label)
  await select.click()

  // Handle both native select and custom dropdown
  const option = page.getByRole('option', { name: optionText }).or(
    page.getByRole('listitem').filter({ hasText: optionText })
  )

  if (await option.isVisible()) {
    await option.click()
  }
}

// Modal helpers
export async function waitForModal(page: Page) {
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 })
}

export async function closeModal(page: Page) {
  const closeButton = page.getByRole('button', { name: /close|cancel|x/i })
  if (await closeButton.isVisible()) {
    await closeButton.click()
  }
}

// Toast/notification helpers
export async function expectSuccessToast(page: Page) {
  await expect(
    page.getByText(/success|created|saved|updated|deleted/i).first()
  ).toBeVisible({ timeout: 5000 })
}

export async function expectErrorToast(page: Page) {
  await expect(
    page.getByText(/error|failed|invalid/i).first()
  ).toBeVisible({ timeout: 5000 })
}
