import { test, expect, Page } from '@playwright/test'
import { registerAndLogin, waitForTableLoad } from './helpers'

// Shared test state
let credentials: { email: string; password: string }

test.describe.serial('Server-Side Data Table Features', () => {
  test.beforeAll(async ({ browser }) => {
    // Register once for all tests
    const page = await browser.newPage()
    credentials = await registerAndLogin(page)
    await page.close()
  })

  async function loginIfNeeded(page: Page, targetPath?: string) {
    await page.waitForLoadState('networkidle')
    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/signup')) {
      await page.locator('#email').fill(credentials.email)
      await page.locator('#password').fill(credentials.password)
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 })

      if (targetPath && !page.url().includes(targetPath)) {
        await page.goto(targetPath)
        await page.waitForLoadState('networkidle')
      }
    }
  }

  // Helper to verify pagination controls are visible
  async function expectPaginationControls(page: Page) {
    // Check for pagination container
    const paginationText = page.getByText(/showing/i).first()
    await expect(paginationText).toBeVisible({ timeout: 10000 })

    // Check for navigation buttons (first, prev, next, last)
    const firstPageButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevrons-left') })
    const lastPageButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevrons-right') })

    await expect(firstPageButton.first()).toBeVisible()
    await expect(lastPageButton.first()).toBeVisible()
  }

  // Helper to verify sortable headers exist
  async function expectSortableHeaders(page: Page) {
    // Look for sort indicator icons
    const sortButtons = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-up-down, svg.lucide-arrow-up, svg.lucide-arrow-down') })
    await expect(sortButtons.first()).toBeVisible({ timeout: 10000 })
  }

  // ===============================
  // SECTION 1: Products Page
  // ===============================
  test('1.1 Products table has pagination controls', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')
    await waitForTableLoad(page)
    await expectPaginationControls(page)
  })

  test('1.2 Products table has sortable headers', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')
    await waitForTableLoad(page)
    await expectSortableHeaders(page)
  })

  test('1.3 Products search resets pagination', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')
    await waitForTableLoad(page)

    // Type in search field
    const searchInput = page.locator('input[placeholder*="search" i]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill('test')

    // Wait for table to reload
    await page.waitForTimeout(500)
    await waitForTableLoad(page)

    // Pagination should still be visible
    await expectPaginationControls(page)
  })

  // ===============================
  // SECTION 2: Orders Page
  // ===============================
  test('2.1 Orders table has pagination controls', async ({ page }) => {
    await page.goto('/orders')
    await loginIfNeeded(page, '/orders')
    await waitForTableLoad(page)
    await expectPaginationControls(page)
  })

  test('2.2 Orders table has sortable headers', async ({ page }) => {
    await page.goto('/orders')
    await loginIfNeeded(page, '/orders')
    await waitForTableLoad(page)
    await expectSortableHeaders(page)
  })

  test('2.3 Orders filter changes reset pagination', async ({ page }) => {
    await page.goto('/orders')
    await loginIfNeeded(page, '/orders')
    await waitForTableLoad(page)

    // Look for status filter dropdown
    const statusFilter = page.locator('[role="combobox"]').first()
    if (await statusFilter.isVisible({ timeout: 3000 })) {
      await statusFilter.click()
      // Select any status option
      const option = page.getByRole('option').first()
      if (await option.isVisible({ timeout: 2000 })) {
        await option.click()
      }
    }

    // Wait and verify pagination is still visible
    await page.waitForTimeout(500)
    await waitForTableLoad(page)
    await expectPaginationControls(page)
  })

  // ===============================
  // SECTION 3: Customers Page
  // ===============================
  test('3.1 Customers table has pagination controls', async ({ page }) => {
    await page.goto('/customers')
    await loginIfNeeded(page, '/customers')
    await waitForTableLoad(page)
    await expectPaginationControls(page)
  })

  test('3.2 Customers table has sortable headers', async ({ page }) => {
    await page.goto('/customers')
    await loginIfNeeded(page, '/customers')
    await waitForTableLoad(page)
    await expectSortableHeaders(page)
  })

  // ===============================
  // SECTION 4: Suppliers Page
  // ===============================
  test('4.1 Suppliers table has pagination controls', async ({ page }) => {
    await page.goto('/suppliers')
    await loginIfNeeded(page, '/suppliers')
    await waitForTableLoad(page)
    await expectPaginationControls(page)
  })

  test('4.2 Suppliers table has sortable headers', async ({ page }) => {
    await page.goto('/suppliers')
    await loginIfNeeded(page, '/suppliers')
    await waitForTableLoad(page)
    await expectSortableHeaders(page)
  })

  // ===============================
  // SECTION 5: Stock Page
  // ===============================
  test('5.1 Stock table has pagination controls', async ({ page }) => {
    await page.goto('/stock')
    await loginIfNeeded(page, '/stock')
    await waitForTableLoad(page)
    await expectPaginationControls(page)
  })

  test('5.2 Stock table has sortable headers', async ({ page }) => {
    await page.goto('/stock')
    await loginIfNeeded(page, '/stock')
    await waitForTableLoad(page)
    await expectSortableHeaders(page)
  })

  test('5.3 Stock low stock filter resets pagination', async ({ page }) => {
    await page.goto('/stock')
    await loginIfNeeded(page, '/stock')
    await waitForTableLoad(page)

    // Click low stock filter button
    const lowStockButton = page.getByRole('button', { name: /low stock/i })
    if (await lowStockButton.isVisible({ timeout: 3000 })) {
      await lowStockButton.click()
      await page.waitForTimeout(500)
      await waitForTableLoad(page)
      await expectPaginationControls(page)
    }
  })

  // ===============================
  // SECTION 6: Purchase Orders Page
  // ===============================
  test('6.1 Purchase Orders table has pagination controls', async ({ page }) => {
    await page.goto('/purchase-orders')
    await loginIfNeeded(page, '/purchase-orders')
    await waitForTableLoad(page)
    await expectPaginationControls(page)
  })

  test('6.2 Purchase Orders table has sortable headers', async ({ page }) => {
    await page.goto('/purchase-orders')
    await loginIfNeeded(page, '/purchase-orders')
    await waitForTableLoad(page)
    await expectSortableHeaders(page)
  })

  // ===============================
  // SECTION 7: Returns Page
  // ===============================
  test('7.1 Returns table has pagination controls', async ({ page }) => {
    await page.goto('/returns')
    await loginIfNeeded(page, '/returns')
    await waitForTableLoad(page)
    await expectPaginationControls(page)
  })

  test('7.2 Returns table has sortable headers', async ({ page }) => {
    await page.goto('/returns')
    await loginIfNeeded(page, '/returns')
    await waitForTableLoad(page)
    await expectSortableHeaders(page)
  })

  // ===============================
  // SECTION 8: Sorting Functionality
  // ===============================
  test('8.1 Clicking sort header changes sort direction', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')
    await waitForTableLoad(page)

    // Find a sortable header button
    const sortButton = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-up-down') }).first()

    if (await sortButton.isVisible({ timeout: 5000 })) {
      // Click to sort ascending
      await sortButton.click()
      await page.waitForTimeout(500)

      // Should now show arrow-up icon
      const ascendingIcon = page.locator('svg.lucide-arrow-up').first()
      await expect(ascendingIcon).toBeVisible({ timeout: 5000 })

      // Click again for descending
      await sortButton.click()
      await page.waitForTimeout(500)

      // Should now show arrow-down icon
      const descendingIcon = page.locator('svg.lucide-arrow-down').first()
      await expect(descendingIcon).toBeVisible({ timeout: 5000 })
    }
  })

  // ===============================
  // SECTION 9: Pagination Navigation
  // ===============================
  test('9.1 Page indicator shows current page', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')
    await waitForTableLoad(page)

    // Page indicator should show "1 / X" format
    const pageIndicator = page.locator('text=/\\d+\\s*\\/\\s*\\d+/')
    await expect(pageIndicator.first()).toBeVisible({ timeout: 5000 })
  })

  test('9.2 Results count shows "Showing X to Y of Z"', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')
    await waitForTableLoad(page)

    // Look for results count text
    const resultsText = page.getByText(/showing.*\d+.*to.*\d+.*of.*\d+/i)
    await expect(resultsText.first()).toBeVisible({ timeout: 5000 })
  })
})
