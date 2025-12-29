import { test, expect } from '@playwright/test'

// Generate unique email for each test run
const testId = Date.now()
const testEmail = `e2e_auth_${testId}@test.com`
const testPassword = 'TestPass123'  // At least 6 characters
const testName = 'Test User'

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')

    // Page should have the welcome message
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Should have email and password inputs
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()

    // Should have sign in button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should show signup page', async ({ page }) => {
    await page.goto('/signup')

    // Page should have create account message
    await expect(page.getByText(/create an account/i)).toBeVisible()

    // Should have required fields
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('should register a new user', async ({ page }) => {
    await page.goto('/signup')

    // Fill registration form
    await page.locator('#name').fill(testName)
    await page.locator('#email').fill(testEmail)
    await page.locator('#password').fill(testPassword)

    // Optional org name
    const orgField = page.locator('#orgName')
    if (await orgField.isVisible()) {
      await orgField.fill('Test Company')
    }

    // Submit
    await page.getByRole('button', { name: /create account/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 })
  })

  test('should login with registered user', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill(testEmail)
    await page.locator('#password').fill(testPassword)

    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.locator('#email').fill('invalid@test.com')
    await page.locator('#password').fill('wrongpass')

    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show error message (toast or inline)
    await expect(
      page.getByText(/invalid|incorrect|error|failed|unauthorized/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()

    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/login/i, { timeout: 5000 })
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login')

    // Click submit without filling form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show validation errors
    await expect(page.getByText(/valid email|email.*required/i)).toBeVisible({ timeout: 3000 })
  })

  test('should navigate between login and signup', async ({ page }) => {
    await page.goto('/login')

    // Click signup link
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/signup/i)

    // Click sign in link
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/login/i)
  })
})
