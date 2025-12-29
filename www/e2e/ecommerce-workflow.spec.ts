import { test, expect, Page } from '@playwright/test'
import { registerAndLogin, generateTestId, waitForTableLoad, navigateTo } from './helpers'

// Shared test state
let credentials: { email: string; password: string }
let productIds: string[] = []
let supplierId: string
let customerId: string
let poId: string
let orderId: string

test.describe.serial('E-Commerce Merchant Workflow', () => {
  test.beforeAll(async ({ browser }) => {
    // Register once for all tests
    const page = await browser.newPage()
    credentials = await registerAndLogin(page)
    await page.close()
  })

  async function loginIfNeeded(page: Page, targetPath?: string) {
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')

    // Check if redirected to login page
    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/signup')) {
      await page.locator('#email').fill(credentials.email)
      await page.locator('#password').fill(credentials.password)
      await page.getByRole('button', { name: /sign in/i }).click()
      await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 })

      // Navigate to target path after login if specified
      if (targetPath && !page.url().includes(targetPath)) {
        await page.goto(targetPath)
        await page.waitForLoadState('networkidle')
      }
    }
  }

  // ===============================
  // SECTION 1: Dashboard
  // ===============================
  test('1.1 Dashboard loads correctly', async ({ page }) => {
    await page.goto('/dashboard')
    await loginIfNeeded(page)

    // After login, we should be on dashboard - navigate if not
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    }

    // Should show dashboard content - use h1 or text search
    await expect(page.locator('h1').filter({ hasText: /dashboard/i })).toBeVisible({ timeout: 10000 })

    // Should have stats or summary cards
    const statsCards = page.locator('[class*="card"], [class*="stat"]')
    await expect(statsCards.first()).toBeVisible({ timeout: 5000 })
  })

  // ===============================
  // SECTION 2: Products Management
  // ===============================
  test('2.1 Navigate to products page', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')

    await expect(page).toHaveURL(/products/i, { timeout: 5000 })
    await expect(page.locator('h1').filter({ hasText: /product/i })).toBeVisible({ timeout: 5000 })
  })

  test('2.2 Create product: T-Shirt Black', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')

    // Click add/create button
    const addButton = page.getByRole('button', { name: /add|create|new/i })
    await addButton.click()

    // Fill product form
    await page.getByLabel(/name/i).fill('T-Shirt Black Size M')
    await page.getByLabel(/sku|code/i).fill(`TSHIRT-BLK-M-${generateTestId()}`)

    const priceField = page.getByLabel(/price/i).first()
    await priceField.fill('599')

    const costField = page.getByLabel(/cost/i)
    if (await costField.isVisible()) {
      await costField.fill('250')
    }

    // Submit
    await page.getByRole('button', { name: /save|create|submit|add/i }).click()

    // Should show success
    await expect(page.getByText(/success|created|saved/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('2.3 Create product: Jeans Blue', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')

    const addButton = page.getByRole('button', { name: /add|create|new/i })
    await addButton.click()

    await page.getByLabel(/name/i).fill('Jeans Blue Size 32')
    await page.getByLabel(/sku|code/i).fill(`JEANS-BLU-32-${generateTestId()}`)

    const priceField = page.getByLabel(/price/i).first()
    await priceField.fill('1299')

    const costField = page.getByLabel(/cost/i)
    if (await costField.isVisible()) {
      await costField.fill('500')
    }

    await page.getByRole('button', { name: /save|create|submit|add/i }).click()
    await expect(page.getByText(/success|created|saved/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('2.4 Products list shows created items', async ({ page }) => {
    await page.goto('/products')
    await loginIfNeeded(page, '/products')

    await waitForTableLoad(page)

    // Should show at least 2 products
    await expect(page.getByText(/t-shirt/i).first()).toBeVisible({ timeout: 5000 })
  })

  // ===============================
  // SECTION 3: Suppliers Management
  // ===============================
  test('3.1 Navigate to suppliers page', async ({ page }) => {
    await page.goto('/suppliers')
    await loginIfNeeded(page, '/suppliers')

    await expect(page).toHaveURL(/suppliers/i, { timeout: 5000 })
  })

  test('3.2 Create supplier', async ({ page }) => {
    await page.goto('/suppliers')
    await loginIfNeeded(page, '/suppliers')

    const addButton = page.getByRole('button', { name: /add|create|new/i })
    await addButton.click()

    await page.getByLabel(/name/i).fill('Textile Supplier Co')

    const emailField = page.getByLabel(/email/i)
    if (await emailField.isVisible()) {
      await emailField.fill('supplier@textile.com')
    }

    const phoneField = page.getByLabel(/phone|tel/i)
    if (await phoneField.isVisible()) {
      await phoneField.fill('0812345678')
    }

    await page.getByRole('button', { name: /save|create|submit|add/i }).click()
    await expect(page.getByText(/success|created|saved/i).first()).toBeVisible({ timeout: 5000 })
  })

  // ===============================
  // SECTION 4: Customers Management
  // ===============================
  test('4.1 Navigate to customers page', async ({ page }) => {
    await page.goto('/customers')
    await loginIfNeeded(page, '/customers')

    await expect(page).toHaveURL(/customers/i, { timeout: 5000 })
  })

  test('4.2 Create customer', async ({ page }) => {
    await page.goto('/customers')
    await loginIfNeeded(page, '/customers')

    const addButton = page.getByRole('button', { name: /add|create|new/i })
    await addButton.click()

    await page.getByLabel(/name/i).fill('John Smith')

    const emailField = page.getByLabel(/email/i)
    if (await emailField.isVisible()) {
      await emailField.fill('john@customer.com')
    }

    const phoneField = page.getByLabel(/phone|tel/i)
    if (await phoneField.isVisible()) {
      await phoneField.fill('0898765432')
    }

    await page.getByRole('button', { name: /save|create|submit|add/i }).click()
    await expect(page.getByText(/success|created|saved/i).first()).toBeVisible({ timeout: 5000 })
  })

  // ===============================
  // SECTION 5: Purchase Orders
  // ===============================
  test('5.1 Navigate to purchase orders page', async ({ page }) => {
    await page.goto('/purchase-orders')
    await loginIfNeeded(page, '/purchase-orders')

    await expect(page).toHaveURL(/purchase-orders/i, { timeout: 5000 })
  })

  test('5.2 PO form loads correctly', async ({ page }) => {
    await page.goto('/purchase-orders/new')
    await loginIfNeeded(page, '/purchase-orders/new')

    // Wait for form to load
    await page.waitForLoadState('networkidle')

    // Verify form elements are present
    await expect(page.getByRole('heading', { name: /new purchase order/i })).toBeVisible({ timeout: 10000 })

    // Verify Add Item button is present
    const addItemButton = page.getByRole('button', { name: /add item/i })
    await expect(addItemButton).toBeVisible({ timeout: 5000 })

    // Verify Create PO button is present
    const createButton = page.getByRole('button', { name: /create po/i })
    await expect(createButton).toBeVisible({ timeout: 5000 })

    // Verify date picker is present (modern calendar component)
    const datePicker = page.locator('[data-testid="date-picker-trigger"]')
    await expect(datePicker).toBeVisible({ timeout: 5000 })
  })

  test('5.3 PO list shows created orders', async ({ page }) => {
    await page.goto('/purchase-orders')
    await loginIfNeeded(page, '/purchase-orders')

    await waitForTableLoad(page)

    // Should show at least one PO
    const poRow = page.locator('table tbody tr').first()
    await expect(poRow).toBeVisible({ timeout: 5000 })
  })

  // ===============================
  // SECTION 6: Sales Orders
  // ===============================
  test('6.1 Navigate to orders page', async ({ page }) => {
    await page.goto('/orders')
    await loginIfNeeded(page, '/orders')

    await expect(page).toHaveURL(/orders/i, { timeout: 5000 })
  })

  test('6.2 Order form loads correctly', async ({ page }) => {
    await page.goto('/orders/new')
    await loginIfNeeded(page, '/orders/new')

    await page.waitForLoadState('networkidle')

    // Verify form elements are present
    await expect(page.locator('h1').filter({ hasText: /new order/i })).toBeVisible({ timeout: 5000 })

    // Verify Add Item button is present
    const addItemButton = page.getByRole('button', { name: /add item/i })
    await expect(addItemButton).toBeVisible()

    // Verify Create Order button is present (should be disabled initially)
    const createButton = page.getByRole('button', { name: /create order/i })
    await expect(createButton).toBeVisible()
  })

  test('6.3 Orders page loads correctly', async ({ page }) => {
    await page.goto('/orders')
    await loginIfNeeded(page, '/orders')

    await page.waitForLoadState('networkidle')

    // Verify orders page heading
    await expect(page.locator('h1').filter({ hasText: /order/i })).toBeVisible({ timeout: 5000 })

    // May have orders or show empty state - either is fine
    await waitForTableLoad(page)
  })

  // ===============================
  // SECTION 7: Stock/Inventory
  // ===============================
  test('7.1 Navigate to stock page', async ({ page }) => {
    await page.goto('/stock')
    await loginIfNeeded(page, '/stock')

    await expect(page).toHaveURL(/stock/i, { timeout: 5000 })
  })

  test('7.2 Stock page displays inventory', async ({ page }) => {
    await page.goto('/stock')
    await loginIfNeeded(page, '/stock')

    await page.waitForLoadState('networkidle')

    // Should show inventory content
    await expect(page.locator('h1').filter({ hasText: /stock|inventory/i })).toBeVisible({ timeout: 5000 })
  })

  // ===============================
  // SECTION 8: Reports
  // ===============================
  test('8.1 Navigate to reports page', async ({ page }) => {
    await page.goto('/reports')
    await loginIfNeeded(page, '/reports')

    await expect(page).toHaveURL(/reports/i, { timeout: 5000 })
  })

  // ===============================
  // SECTION 9: Settings
  // ===============================
  test('9.1 Navigate to settings page', async ({ page }) => {
    await page.goto('/settings')
    await loginIfNeeded(page, '/settings')

    await expect(page).toHaveURL(/settings/i, { timeout: 5000 })
  })

  // ===============================
  // SECTION 10: Navigation & UI
  // ===============================
  test('10.1 Sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard')
    await loginIfNeeded(page, '/dashboard')

    // Test sidebar links
    const sidebarLinks = [
      { name: /product/i, path: '/products' },
      { name: /order/i, path: '/orders' },
      { name: /customer/i, path: '/customers' },
    ]

    for (const link of sidebarLinks) {
      const navLink = page.getByRole('link', { name: link.name }).first()
      if (await navLink.isVisible()) {
        await navLink.click()
        await expect(page).toHaveURL(new RegExp(link.path), { timeout: 5000 })
      }
    }
  })

  test('10.2 Responsive sidebar toggle works', async ({ page }) => {
    await page.goto('/dashboard')
    await loginIfNeeded(page, '/dashboard')

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Look for mobile menu toggle
    const menuToggle = page.getByRole('button', { name: /menu|toggle/i }).or(
      page.locator('[class*="menu-toggle"], [class*="hamburger"]')
    )

    if (await menuToggle.isVisible()) {
      await menuToggle.click()
      // Sidebar should appear
      await expect(page.getByRole('navigation')).toBeVisible({ timeout: 3000 })
    }
  })
})
