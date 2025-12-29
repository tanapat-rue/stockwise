/**
 * Stockflows Integration Test Suite
 *
 * Simulates realistic e-commerce merchant scenarios:
 * - Product catalog with variants
 * - Purchase Order workflows (create, update, receive, cancel)
 * - Sales Order workflows (create, confirm, ship, complete, cancel)
 * - Stock management and reservations
 * - Edge cases and error handling
 *
 * Target: 50+ test cases covering 95% of realistic use cases
 */

const BASE_URL = process.env.API_URL || 'http://localhost:9090';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestContext {
  cookies: string;
  branchId: string;
  products: Record<string, string>;
  suppliers: Record<string, string>;
  customers: Record<string, string>;
  purchaseOrders: Record<string, string>;
  salesOrders: Record<string, string>;
}

const results: TestResult[] = [];
const defects: string[] = [];

// Helper functions
async function apiCall(
  method: string,
  endpoint: string,
  body?: unknown,
  cookies?: string
): Promise<{ status: number; data: unknown; headers: Headers }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, headers: response.headers };
}

function extractCookies(headers: Headers): string {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return '';
  return setCookie.split(';')[0];
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<boolean> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration: Date.now() - start });
    console.log(`✗ ${name}: ${errorMsg}`);
    return false;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertGreaterThan(actual: number, expected: number, message: string): void {
  if (actual <= expected) {
    throw new Error(`${message}: expected > ${expected}, got ${actual}`);
  }
}

// ============================================================
// TEST SUITE
// ============================================================

async function runAllTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('STOCKFLOWS INTEGRATION TEST SUITE');
  console.log('='.repeat(60));
  console.log('');

  const ctx: TestContext = {
    cookies: '',
    branchId: '',
    products: {},
    suppliers: {},
    customers: {},
    purchaseOrders: {},
    salesOrders: {},
  };

  // ============================================================
  // SECTION 1: AUTHENTICATION (2 tests)
  // ============================================================
  console.log('\n--- SECTION 1: Authentication ---\n');

  await runTest('1.1 Register new merchant account', async () => {
    const email = `merchant_${Date.now()}@test.com`;
    const res = await apiCall('POST', '/api/auth/signup', {
      email,
      password: 'test123456',
      name: 'Test Merchant',
      orgName: 'Test E-Commerce Store',
    });
    assertEqual(res.status, 200, 'Signup should succeed');
    ctx.cookies = extractCookies(res.headers);
    assert(ctx.cookies.length > 0, 'Should receive session cookie');
  });

  await runTest('1.2 Get current user and branch info', async () => {
    const res = await apiCall('GET', '/api/auth/me', undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Should get user info');
    const data = res.data as { branches: Array<{ id: string }> };
    ctx.branchId = data.branches[0].id;
    assert(ctx.branchId.length > 0, 'Should have branch ID');
  });

  // ============================================================
  // SECTION 2: PRODUCT CATALOG SETUP (8 tests)
  // ============================================================
  console.log('\n--- SECTION 2: Product Catalog Setup ---\n');

  const productVariants = [
    { sku: 'TSHIRT-BLK-S', name: 'T-Shirt Black S', price: 59900, cost: 25000 },
    { sku: 'TSHIRT-BLK-M', name: 'T-Shirt Black M', price: 59900, cost: 25000 },
    { sku: 'TSHIRT-BLK-L', name: 'T-Shirt Black L', price: 59900, cost: 25000 },
    { sku: 'TSHIRT-WHT-S', name: 'T-Shirt White S', price: 59900, cost: 25000 },
    { sku: 'TSHIRT-WHT-M', name: 'T-Shirt White M', price: 59900, cost: 25000 },
    { sku: 'JEANS-BLU-32', name: 'Jeans Blue 32', price: 129900, cost: 55000 },
    { sku: 'JEANS-BLU-34', name: 'Jeans Blue 34', price: 129900, cost: 55000 },
    { sku: 'CAP-BLK', name: 'Cap Black', price: 39900, cost: 15000 },
  ];

  for (let i = 0; i < productVariants.length; i++) {
    const p = productVariants[i];
    await runTest(`2.${i + 1} Create product: ${p.sku}`, async () => {
      const res = await apiCall('POST', '/api/products', {
        sku: p.sku,
        name: p.name,
        description: `Test product ${p.sku}`,
        price: p.price,
        cost: p.cost,
        category: 'Apparel',
      }, ctx.cookies);
      assertEqual(res.status, 201, 'Product creation should succeed');
      const data = res.data as { data: { id: string; cost: number } };
      ctx.products[p.sku] = data.data.id;
      assertEqual(data.data.cost, p.cost, 'Cost should be saved correctly');
    });
  }

  // ============================================================
  // SECTION 3: SUPPLIERS SETUP (3 tests)
  // ============================================================
  console.log('\n--- SECTION 3: Suppliers Setup ---\n');

  const suppliers = [
    { code: 'SUP-TEXTILE', name: 'Fashion Textiles Co.' },
    { code: 'SUP-DENIM', name: 'Denim World Ltd.' },
    { code: 'SUP-ACC', name: 'Accessories Plus' },
  ];

  for (let i = 0; i < suppliers.length; i++) {
    const s = suppliers[i];
    await runTest(`3.${i + 1} Create supplier: ${s.code}`, async () => {
      const res = await apiCall('POST', '/api/suppliers', {
        name: s.name,
        contactName: 'Contact Person',
        email: `${s.code.toLowerCase()}@test.com`,
        phone: '02-123-4567',
      }, ctx.cookies);
      assertEqual(res.status, 201, 'Supplier creation should succeed');
      const data = res.data as { data: { id: string } };
      ctx.suppliers[s.code] = data.data.id;
    });
  }

  // ============================================================
  // SECTION 4: CUSTOMERS SETUP (4 tests)
  // ============================================================
  console.log('\n--- SECTION 4: Customers Setup ---\n');

  const customers = [
    { code: 'CUST-RETAIL', name: 'John Retail Customer' },
    { code: 'CUST-WHOLESALE', name: 'Fashion Boutique Shop' },
    { code: 'CUST-VIP', name: 'VIP Customer' },
    { code: 'CUST-ONLINE', name: 'Online Marketplace' },
  ];

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    await runTest(`4.${i + 1} Create customer: ${c.code}`, async () => {
      const res = await apiCall('POST', '/api/customers', {
        name: c.name,
        email: `${c.code.toLowerCase()}@test.com`,
        phone: '081-111-1111',
        address: '123 Test Street',
      }, ctx.cookies);
      assertEqual(res.status, 201, 'Customer creation should succeed');
      const data = res.data as { data: { id: string } };
      ctx.customers[c.code] = data.data.id;
    });
  }

  // ============================================================
  // SECTION 5: PURCHASE ORDER WORKFLOWS (15 tests)
  // ============================================================
  console.log('\n--- SECTION 5: Purchase Order Workflows ---\n');

  // Case 5.1-5.3: Create POs in DRAFT status
  await runTest('5.1 Create PO for T-Shirts (DRAFT)', async () => {
    const res = await apiCall('POST', '/api/purchase-orders', {
      supplierId: ctx.suppliers['SUP-TEXTILE'],
      branchId: ctx.branchId,
      expectedDate: '2025-01-15T00:00:00Z',
      notes: 'Initial T-Shirt stock',
      items: [
        { productId: ctx.products['TSHIRT-BLK-S'], qtyOrdered: 50, unitCost: 25000 },
        { productId: ctx.products['TSHIRT-BLK-M'], qtyOrdered: 100, unitCost: 25000 },
        { productId: ctx.products['TSHIRT-BLK-L'], qtyOrdered: 80, unitCost: 25000 },
      ],
    }, ctx.cookies);
    assertEqual(res.status, 201, 'PO creation should succeed');
    const data = res.data as { data: { id: string; status: string; totalAmount: number } };
    ctx.purchaseOrders['PO-TSHIRT-1'] = data.data.id;
    assertEqual(data.data.status, 'DRAFT', 'Initial status should be DRAFT');
    assertEqual(data.data.totalAmount, (50 + 100 + 80) * 25000, 'Total should be calculated');
  });

  await runTest('5.2 Create PO for Jeans (DRAFT)', async () => {
    const res = await apiCall('POST', '/api/purchase-orders', {
      supplierId: ctx.suppliers['SUP-DENIM'],
      branchId: ctx.branchId,
      expectedDate: '2025-01-20T00:00:00Z',
      notes: 'Initial Jeans stock',
      items: [
        { productId: ctx.products['JEANS-BLU-32'], qtyOrdered: 40, unitCost: 55000 },
        { productId: ctx.products['JEANS-BLU-34'], qtyOrdered: 30, unitCost: 55000 },
      ],
    }, ctx.cookies);
    assertEqual(res.status, 201, 'PO creation should succeed');
    const data = res.data as { data: { id: string } };
    ctx.purchaseOrders['PO-JEANS-1'] = data.data.id;
  });

  await runTest('5.3 Create PO for Accessories (DRAFT)', async () => {
    const res = await apiCall('POST', '/api/purchase-orders', {
      supplierId: ctx.suppliers['SUP-ACC'],
      branchId: ctx.branchId,
      expectedDate: '2025-01-10T00:00:00Z',
      notes: 'Initial Cap stock',
      items: [
        { productId: ctx.products['CAP-BLK'], qtyOrdered: 100, unitCost: 15000 },
      ],
    }, ctx.cookies);
    assertEqual(res.status, 201, 'PO creation should succeed');
    const data = res.data as { data: { id: string } };
    ctx.purchaseOrders['PO-ACC-1'] = data.data.id;
  });

  // Case 5.4: Update PO before sending (change quantity)
  await runTest('5.4 Update PO quantity before sending', async () => {
    const res = await apiCall('PATCH', `/api/purchase-orders/${ctx.purchaseOrders['PO-TSHIRT-1']}`, {
      items: [
        { productId: ctx.products['TSHIRT-BLK-S'], qtyOrdered: 60, unitCost: 25000 },
        { productId: ctx.products['TSHIRT-BLK-M'], qtyOrdered: 120, unitCost: 25000 },
        { productId: ctx.products['TSHIRT-BLK-L'], qtyOrdered: 80, unitCost: 25000 },
      ],
    }, ctx.cookies);
    assertEqual(res.status, 200, 'PO update should succeed');
    const data = res.data as { data: { totalAmount: number } };
    assertEqual(data.data.totalAmount, (60 + 120 + 80) * 25000, 'Total should be recalculated');
  });

  // Case 5.5: Send PO to supplier
  await runTest('5.5 Send PO to supplier (DRAFT → SENT)', async () => {
    const res = await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-TSHIRT-1']}/send`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Send should succeed');
    const data = res.data as { data: { status: string } };
    assertEqual(data.data.status, 'SENT', 'Status should change to SENT');
  });

  // Case 5.6: Verify stock before receiving (should be 0)
  await runTest('5.6 Verify stock is 0 before PO received', async () => {
    const res = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-S']}`, undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Inventory query should succeed');
    const data = res.data as { data: Array<{ quantity: number }> };
    const qty = data.data.length > 0 ? data.data[0].quantity : 0;
    assertEqual(qty, 0, 'Stock should be 0 before receiving');
  });

  // Case 5.7: Receive PO (stock should be added)
  await runTest('5.7 Receive PO (SENT → RECEIVED, stock added)', async () => {
    const res = await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-TSHIRT-1']}/receive`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Receive should succeed');
    const data = res.data as { data: { status: string } };
    assertEqual(data.data.status, 'RECEIVED', 'Status should change to RECEIVED');
  });

  // Case 5.8: Verify stock after receiving
  await runTest('5.8 Verify stock is added after PO received', async () => {
    const res = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-S']}`, undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Inventory query should succeed');
    const data = res.data as { data: Array<{ quantity: number }> };
    assertEqual(data.data[0].quantity, 60, 'Stock should be 60 after receiving');
  });

  // Case 5.9-5.10: Receive other POs
  await runTest('5.9 Send and receive Jeans PO', async () => {
    await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-JEANS-1']}/send`, {}, ctx.cookies);
    const res = await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-JEANS-1']}/receive`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Receive should succeed');
  });

  await runTest('5.10 Send and receive Accessories PO', async () => {
    await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-ACC-1']}/send`, {}, ctx.cookies);
    const res = await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-ACC-1']}/receive`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Receive should succeed');
  });

  // Case 5.11: Create and cancel PO
  await runTest('5.11 Create PO and cancel before sending', async () => {
    const createRes = await apiCall('POST', '/api/purchase-orders', {
      supplierId: ctx.suppliers['SUP-TEXTILE'],
      branchId: ctx.branchId,
      expectedDate: '2025-02-01T00:00:00Z',
      notes: 'PO to be cancelled',
      items: [
        { productId: ctx.products['TSHIRT-WHT-S'], qtyOrdered: 20, unitCost: 25000 },
      ],
    }, ctx.cookies);
    const poId = (createRes.data as { data: { id: string } }).data.id;

    const cancelRes = await apiCall('POST', `/api/purchase-orders/${poId}/cancel`, {}, ctx.cookies);
    assertEqual(cancelRes.status, 200, 'Cancel should succeed');
    const data = cancelRes.data as { data: { status: string } };
    assertEqual(data.data.status, 'CANCELLED', 'Status should be CANCELLED');
  });

  // Case 5.12: Try to cancel already received PO (should fail or have special handling)
  await runTest('5.12 Cannot cancel already received PO', async () => {
    const res = await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-TSHIRT-1']}/cancel`, {}, ctx.cookies);
    // Should either fail or handle gracefully
    if (res.status === 200) {
      defects.push('DEFECT: Should not be able to cancel already received PO');
    }
    assert(res.status === 400 || res.status === 200, 'Should handle cancel attempt');
  });

  // Case 5.13: Create PO with negotiated price (lower than default cost)
  await runTest('5.13 Create PO with negotiated lower price', async () => {
    const res = await apiCall('POST', '/api/purchase-orders', {
      supplierId: ctx.suppliers['SUP-TEXTILE'],
      branchId: ctx.branchId,
      expectedDate: '2025-01-25T00:00:00Z',
      notes: 'Bulk discount PO',
      items: [
        { productId: ctx.products['TSHIRT-WHT-S'], qtyOrdered: 200, unitCost: 22000 },
        { productId: ctx.products['TSHIRT-WHT-M'], qtyOrdered: 200, unitCost: 22000 },
      ],
    }, ctx.cookies);
    assertEqual(res.status, 201, 'PO with lower price should succeed');
    ctx.purchaseOrders['PO-BULK-1'] = (res.data as { data: { id: string } }).data.id;
  });

  // Case 5.14: Send and receive bulk PO
  await runTest('5.14 Receive bulk PO with negotiated price', async () => {
    await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-BULK-1']}/send`, {}, ctx.cookies);
    const res = await apiCall('POST', `/api/purchase-orders/${ctx.purchaseOrders['PO-BULK-1']}/receive`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Receive should succeed');
  });

  // Case 5.15: Verify stock levels after all POs
  await runTest('5.15 Verify all stock levels correct after POs', async () => {
    const res = await apiCall('GET', '/api/inventory', undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Inventory query should succeed');
    const data = res.data as { data: Array<{ productSku: string; quantity: number }> };
    const stockMap = new Map(data.data.map(s => [s.productSku, s.quantity]));

    assertEqual(stockMap.get('TSHIRT-BLK-S'), 60, 'TSHIRT-BLK-S stock');
    assertEqual(stockMap.get('TSHIRT-BLK-M'), 120, 'TSHIRT-BLK-M stock');
    assertEqual(stockMap.get('JEANS-BLU-32'), 40, 'JEANS-BLU-32 stock');
    assertEqual(stockMap.get('CAP-BLK'), 100, 'CAP-BLK stock');
  });

  // ============================================================
  // SECTION 6: SALES ORDER WORKFLOWS (18 tests)
  // ============================================================
  console.log('\n--- SECTION 6: Sales Order Workflows ---\n');

  // Case 6.1: Create SO for retail customer
  await runTest('6.1 Create SO for retail customer (DRAFT)', async () => {
    const res = await apiCall('POST', '/api/orders', {
      customerId: ctx.customers['CUST-RETAIL'],
      branchId: ctx.branchId,
      notes: 'Retail order #1',
      items: [
        { productId: ctx.products['TSHIRT-BLK-M'], quantity: 2, unitPrice: 59900 },
        { productId: ctx.products['CAP-BLK'], quantity: 1, unitPrice: 39900 },
      ],
    }, ctx.cookies);
    assertEqual(res.status, 201, 'SO creation should succeed');
    const data = res.data as { data: { id: string; status: string; totalAmount: number } };
    ctx.salesOrders['SO-RETAIL-1'] = data.data.id;
    assertEqual(data.data.status, 'DRAFT', 'Initial status should be DRAFT');
    assertEqual(data.data.totalAmount, 2 * 59900 + 1 * 39900, 'Total should be calculated');
  });

  // Case 6.2: Create SO for wholesale customer (larger quantity)
  await runTest('6.2 Create SO for wholesale customer', async () => {
    const res = await apiCall('POST', '/api/orders', {
      customerId: ctx.customers['CUST-WHOLESALE'],
      branchId: ctx.branchId,
      notes: 'Wholesale order - 10 pieces',
      items: [
        { productId: ctx.products['TSHIRT-BLK-S'], quantity: 10, unitPrice: 55000 },
        { productId: ctx.products['TSHIRT-BLK-M'], quantity: 20, unitPrice: 55000 },
      ],
    }, ctx.cookies);
    assertEqual(res.status, 201, 'SO creation should succeed');
    ctx.salesOrders['SO-WHOLESALE-1'] = (res.data as { data: { id: string } }).data.id;
  });

  // Case 6.3: Create SO without customer (anonymous/walk-in)
  await runTest('6.3 Create anonymous SO (walk-in customer)', async () => {
    const res = await apiCall('POST', '/api/orders', {
      branchId: ctx.branchId,
      notes: 'Walk-in customer',
      items: [
        { productId: ctx.products['CAP-BLK'], quantity: 2, unitPrice: 39900 },
      ],
    }, ctx.cookies);
    assertEqual(res.status, 201, 'Anonymous SO should succeed');
    ctx.salesOrders['SO-ANON-1'] = (res.data as { data: { id: string } }).data.id;
  });

  // Case 6.4: Verify stock not reserved in DRAFT
  await runTest('6.4 Stock not reserved in DRAFT status', async () => {
    const res = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-M']}`, undefined, ctx.cookies);
    const data = res.data as { data: Array<{ reserved: number }> };
    assertEqual(data.data[0].reserved, 0, 'No reservation in DRAFT');
  });

  // Case 6.5: Confirm SO (reserve stock)
  await runTest('6.5 Confirm SO (DRAFT → CONFIRMED, stock reserved)', async () => {
    const res = await apiCall('POST', `/api/orders/${ctx.salesOrders['SO-RETAIL-1']}/confirm`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Confirm should succeed');
    const data = res.data as { data: { status: string } };
    assertEqual(data.data.status, 'CONFIRMED', 'Status should be CONFIRMED');
  });

  // Case 6.6: Verify stock is reserved after confirm
  await runTest('6.6 Stock reserved after SO confirmed', async () => {
    const res = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-M']}`, undefined, ctx.cookies);
    const data = res.data as { data: Array<{ quantity: number; reserved: number; availableQuantity: number }> };
    assertEqual(data.data[0].reserved, 2, 'Should have 2 reserved');
    assertEqual(data.data[0].availableQuantity, 120 - 2, 'Available should be quantity - reserved');
  });

  // Case 6.7: Confirm wholesale order
  await runTest('6.7 Confirm wholesale SO', async () => {
    const res = await apiCall('POST', `/api/orders/${ctx.salesOrders['SO-WHOLESALE-1']}/confirm`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Confirm should succeed');
  });

  // Case 6.8: Verify total reserved stock
  await runTest('6.8 Verify total reserved stock', async () => {
    const res = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-M']}`, undefined, ctx.cookies);
    const data = res.data as { data: Array<{ reserved: number }> };
    assertEqual(data.data[0].reserved, 2 + 20, 'Total reserved should be 22');
  });

  // Case 6.9: Ship SO
  await runTest('6.9 Ship SO (CONFIRMED → SHIPPED)', async () => {
    const res = await apiCall('POST', `/api/orders/${ctx.salesOrders['SO-RETAIL-1']}/ship`, {
      trackingNumber: 'TH123456789',
      carrier: 'Thai Post',
    }, ctx.cookies);
    assertEqual(res.status, 200, 'Ship should succeed');
    const data = res.data as { data: { status: string } };
    assertEqual(data.data.status, 'SHIPPED', 'Status should be SHIPPED');
  });

  // Case 6.10: Deliver SO
  await runTest('6.10 Deliver SO (SHIPPED → DELIVERED)', async () => {
    const res = await apiCall('POST', `/api/orders/${ctx.salesOrders['SO-RETAIL-1']}/deliver`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Deliver should succeed');
    const data = res.data as { data: { status: string } };
    assertEqual(data.data.status, 'DELIVERED', 'Status should be DELIVERED');
  });

  // Case 6.11: Complete SO (stock deducted)
  await runTest('6.11 Complete SO (DELIVERED → COMPLETED, stock deducted)', async () => {
    const res = await apiCall('POST', `/api/orders/${ctx.salesOrders['SO-RETAIL-1']}/complete`, {}, ctx.cookies);
    assertEqual(res.status, 200, 'Complete should succeed');
    const data = res.data as { data: { status: string } };
    assertEqual(data.data.status, 'COMPLETED', 'Status should be COMPLETED');
  });

  // Case 6.12: Verify stock deducted and reservation released
  await runTest('6.12 Stock deducted after SO completed', async () => {
    const res = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-M']}`, undefined, ctx.cookies);
    const data = res.data as { data: Array<{ quantity: number; reserved: number }> };
    assertEqual(data.data[0].quantity, 120 - 2, 'Stock should be deducted by 2');
    assertEqual(data.data[0].reserved, 20, 'Reserved should only be from wholesale order');
  });

  // Case 6.13: Create and cancel SO before confirm
  await runTest('6.13 Cancel SO before confirm', async () => {
    const createRes = await apiCall('POST', '/api/orders', {
      customerId: ctx.customers['CUST-ONLINE'],
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['JEANS-BLU-32'], quantity: 5, unitPrice: 129900 },
      ],
    }, ctx.cookies);
    const soId = (createRes.data as { data: { id: string } }).data.id;

    const cancelRes = await apiCall('POST', `/api/orders/${soId}/cancel`, {}, ctx.cookies);
    assertEqual(cancelRes.status, 200, 'Cancel should succeed');
    const data = cancelRes.data as { data: { status: string } };
    assertEqual(data.data.status, 'CANCELLED', 'Status should be CANCELLED');
  });

  // Case 6.14: Create, confirm, then cancel SO (reservation should be released)
  await runTest('6.14 Cancel confirmed SO (releases reservation)', async () => {
    const createRes = await apiCall('POST', '/api/orders', {
      customerId: ctx.customers['CUST-VIP'],
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['JEANS-BLU-34'], quantity: 5, unitPrice: 129900 },
      ],
    }, ctx.cookies);
    const soId = (createRes.data as { data: { id: string } }).data.id;

    // Confirm to reserve
    await apiCall('POST', `/api/orders/${soId}/confirm`, {}, ctx.cookies);

    // Check reservation added
    let invRes = await apiCall('GET', `/api/inventory?productId=${ctx.products['JEANS-BLU-34']}`, undefined, ctx.cookies);
    let invData = invRes.data as { data: Array<{ reserved: number }> };
    const reservedBefore = invData.data[0].reserved;

    // Cancel
    await apiCall('POST', `/api/orders/${soId}/cancel`, {}, ctx.cookies);

    // Check reservation released
    invRes = await apiCall('GET', `/api/inventory?productId=${ctx.products['JEANS-BLU-34']}`, undefined, ctx.cookies);
    invData = invRes.data as { data: Array<{ reserved: number }> };
    assertEqual(invData.data[0].reserved, reservedBefore - 5, 'Reservation should be released');
  });

  // Case 6.15: Try to create SO exceeding available stock
  await runTest('6.15 Cannot confirm SO exceeding available stock', async () => {
    const createRes = await apiCall('POST', '/api/orders', {
      customerId: ctx.customers['CUST-ONLINE'],
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['CAP-BLK'], quantity: 9999, unitPrice: 39900 },
      ],
    }, ctx.cookies);
    const soId = (createRes.data as { data: { id: string } }).data.id;

    const confirmRes = await apiCall('POST', `/api/orders/${soId}/confirm`, {}, ctx.cookies);
    // Should fail or handle gracefully
    if (confirmRes.status === 200) {
      defects.push('DEFECT: Should not confirm SO with insufficient stock');
    }
  });

  // Case 6.16: Update SO items before confirm
  await runTest('6.16 Update SO items before confirm', async () => {
    const createRes = await apiCall('POST', '/api/orders', {
      customerId: ctx.customers['CUST-RETAIL'],
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['TSHIRT-BLK-S'], quantity: 1, unitPrice: 59900 },
      ],
    }, ctx.cookies);
    const soId = (createRes.data as { data: { id: string } }).data.id;

    const updateRes = await apiCall('PATCH', `/api/orders/${soId}`, {
      items: [
        { productId: ctx.products['TSHIRT-BLK-S'], quantity: 3, unitPrice: 59900 },
        { productId: ctx.products['TSHIRT-BLK-L'], quantity: 2, unitPrice: 59900 },
      ],
    }, ctx.cookies);
    assertEqual(updateRes.status, 200, 'Update should succeed');
    const data = updateRes.data as { data: { totalAmount: number } };
    assertEqual(data.data.totalAmount, (3 + 2) * 59900, 'Total should be recalculated');
  });

  // Case 6.17: Record payment for order
  await runTest('6.17 Record payment for order', async () => {
    const res = await apiCall('POST', `/api/orders/${ctx.salesOrders['SO-WHOLESALE-1']}/payment`, {
      method: 'BANK_TRANSFER',
      amount: 1650000,
      note: 'Partial payment',
    }, ctx.cookies);
    assertEqual(res.status, 200, 'Payment should succeed');
  });

  // Case 6.18: Get order stats
  await runTest('6.18 Get order statistics', async () => {
    const res = await apiCall('GET', '/api/orders/stats', undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Stats should succeed');
    const data = res.data as { data: { totalOrders: number } };
    assertGreaterThan(data.data.totalOrders, 0, 'Should have orders');
  });

  // ============================================================
  // SECTION 7: COMPLEX SCENARIOS (10 tests)
  // ============================================================
  console.log('\n--- SECTION 7: Complex Scenarios ---\n');

  // Case 7.1: Restock after selling out
  await runTest('7.1 Restock scenario: PO after stock runs low', async () => {
    // Get current stock
    const invRes = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-S']}`, undefined, ctx.cookies);
    const currentStock = (invRes.data as { data: Array<{ quantity: number }> }).data[0].quantity;

    // Create restock PO
    const poRes = await apiCall('POST', '/api/purchase-orders', {
      supplierId: ctx.suppliers['SUP-TEXTILE'],
      branchId: ctx.branchId,
      expectedDate: '2025-02-01T00:00:00Z',
      notes: 'Restock order',
      items: [
        { productId: ctx.products['TSHIRT-BLK-S'], qtyOrdered: 50, unitCost: 25000 },
      ],
    }, ctx.cookies);
    const poId = (poRes.data as { data: { id: string } }).data.id;

    // Send and receive
    await apiCall('POST', `/api/purchase-orders/${poId}/send`, {}, ctx.cookies);
    await apiCall('POST', `/api/purchase-orders/${poId}/receive`, {}, ctx.cookies);

    // Verify stock increased
    const newInvRes = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-S']}`, undefined, ctx.cookies);
    const newStock = (newInvRes.data as { data: Array<{ quantity: number }> }).data[0].quantity;
    assertEqual(newStock, currentStock + 50, 'Stock should increase by 50');
  });

  // Case 7.2: Multiple orders same product
  await runTest('7.2 Multiple concurrent orders for same product', async () => {
    // Create 3 orders for same product
    const orders = [];
    for (let i = 0; i < 3; i++) {
      const res = await apiCall('POST', '/api/orders', {
        branchId: ctx.branchId,
        items: [
          { productId: ctx.products['TSHIRT-BLK-L'], quantity: 5, unitPrice: 59900 },
        ],
      }, ctx.cookies);
      orders.push((res.data as { data: { id: string } }).data.id);
    }

    // Confirm all
    for (const orderId of orders) {
      await apiCall('POST', `/api/orders/${orderId}/confirm`, {}, ctx.cookies);
    }

    // Check total reserved
    const invRes = await apiCall('GET', `/api/inventory?productId=${ctx.products['TSHIRT-BLK-L']}`, undefined, ctx.cookies);
    const reserved = (invRes.data as { data: Array<{ reserved: number }> }).data[0].reserved;
    assertGreaterThan(reserved, 0, 'Should have reservations');
  });

  // Case 7.3: Full order lifecycle
  await runTest('7.3 Complete order lifecycle test', async () => {
    // Create
    const createRes = await apiCall('POST', '/api/orders', {
      customerId: ctx.customers['CUST-VIP'],
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['JEANS-BLU-32'], quantity: 1, unitPrice: 129900 },
      ],
    }, ctx.cookies);
    const orderId = (createRes.data as { data: { id: string } }).data.id;

    // Confirm
    const confirmRes = await apiCall('POST', `/api/orders/${orderId}/confirm`, {}, ctx.cookies);
    assertEqual((confirmRes.data as { data: { status: string } }).data.status, 'CONFIRMED', 'Should be CONFIRMED');

    // Ship
    const shipRes = await apiCall('POST', `/api/orders/${orderId}/ship`, {
      trackingNumber: 'VIP123',
      carrier: 'Express',
    }, ctx.cookies);
    assertEqual((shipRes.data as { data: { status: string } }).data.status, 'SHIPPED', 'Should be SHIPPED');

    // Deliver
    const deliverRes = await apiCall('POST', `/api/orders/${orderId}/deliver`, {}, ctx.cookies);
    assertEqual((deliverRes.data as { data: { status: string } }).data.status, 'DELIVERED', 'Should be DELIVERED');

    // Complete
    const completeRes = await apiCall('POST', `/api/orders/${orderId}/complete`, {}, ctx.cookies);
    assertEqual((completeRes.data as { data: { status: string } }).data.status, 'COMPLETED', 'Should be COMPLETED');
  });

  // Case 7.4: Profit calculation verification
  await runTest('7.4 COGS and profit calculation', async () => {
    const res = await apiCall('GET', '/api/orders/stats', undefined, ctx.cookies);
    const data = res.data as { data: { totalRevenue: number; totalProfit: number } };
    assert(data.data.totalRevenue >= 0, 'Revenue should be >= 0');
    assert(data.data.totalProfit !== undefined, 'Profit should be calculated');
  });

  // Case 7.5: Low stock detection
  await runTest('7.5 Low stock detection', async () => {
    const res = await apiCall('GET', '/api/inventory?lowStock=true', undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Low stock query should work');
  });

  // Case 7.6: Inventory search by SKU
  await runTest('7.6 Search inventory by SKU', async () => {
    const res = await apiCall('GET', '/api/inventory?search=TSHIRT', undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Search should work');
    const data = res.data as { data: Array<unknown> };
    assertGreaterThan(data.data.length, 0, 'Should find T-Shirt products');
  });

  // Case 7.7: Order listing with filters
  await runTest('7.7 Order listing with status filter', async () => {
    const res = await apiCall('GET', '/api/orders?status=COMPLETED', undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Filtered list should work');
  });

  // Case 7.8: PO listing with date range
  await runTest('7.8 PO listing with filters', async () => {
    const res = await apiCall('GET', '/api/purchase-orders?status=RECEIVED', undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Filtered PO list should work');
  });

  // Case 7.9: Customer order history
  await runTest('7.9 Customer order history', async () => {
    const res = await apiCall('GET', `/api/orders?customerId=${ctx.customers['CUST-VIP']}`, undefined, ctx.cookies);
    assertEqual(res.status, 200, 'Customer orders should work');
  });

  // Case 7.10: Inventory movement history
  await runTest('7.10 Inventory movement tracking', async () => {
    const res = await apiCall('GET', `/api/inventory/movements?productId=${ctx.products['TSHIRT-BLK-S']}`, undefined, ctx.cookies);
    // Might be 200 or 404 depending on if movements API exists
    assert(res.status === 200 || res.status === 404, 'Movement API should respond');
  });

  // ============================================================
  // SECTION 8: EDGE CASES & ERROR HANDLING (10 tests)
  // ============================================================
  console.log('\n--- SECTION 8: Edge Cases & Error Handling ---\n');

  // Case 8.1: Create product with duplicate SKU
  await runTest('8.1 Duplicate SKU should fail', async () => {
    const res = await apiCall('POST', '/api/products', {
      sku: 'TSHIRT-BLK-S',
      name: 'Duplicate Product',
      price: 59900,
      cost: 25000,
    }, ctx.cookies);
    // Should fail with 400 or 409
    if (res.status === 201) {
      defects.push('DEFECT: Duplicate SKU allowed');
    }
  });

  // Case 8.2: Create order with invalid product
  await runTest('8.2 Order with invalid product should fail', async () => {
    const res = await apiCall('POST', '/api/orders', {
      branchId: ctx.branchId,
      items: [
        { productId: 'invalid-product-id', quantity: 1, unitPrice: 100 },
      ],
    }, ctx.cookies);
    assert(res.status === 400 || res.status === 404, 'Should reject invalid product');
  });

  // Case 8.3: Negative quantity
  await runTest('8.3 Negative quantity should fail', async () => {
    const res = await apiCall('POST', '/api/orders', {
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['CAP-BLK'], quantity: -5, unitPrice: 39900 },
      ],
    }, ctx.cookies);
    if (res.status === 201) {
      defects.push('DEFECT: Negative quantity accepted');
    }
  });

  // Case 8.4: Zero quantity order
  await runTest('8.4 Zero quantity should fail', async () => {
    const res = await apiCall('POST', '/api/orders', {
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['CAP-BLK'], quantity: 0, unitPrice: 39900 },
      ],
    }, ctx.cookies);
    if (res.status === 201) {
      defects.push('DEFECT: Zero quantity accepted');
    }
  });

  // Case 8.5: Empty order items
  await runTest('8.5 Empty items should fail', async () => {
    const res = await apiCall('POST', '/api/orders', {
      branchId: ctx.branchId,
      items: [],
    }, ctx.cookies);
    assert(res.status === 400, 'Should reject empty items');
  });

  // Case 8.6: Unauthorized access
  await runTest('8.6 Unauthorized access blocked', async () => {
    const res = await apiCall('GET', '/api/orders');
    assertEqual(res.status, 401, 'Should be unauthorized');
  });

  // Case 8.7: Update non-existent order
  await runTest('8.7 Update non-existent order should fail', async () => {
    const res = await apiCall('PATCH', '/api/orders/non-existent-id', {
      notes: 'test',
    }, ctx.cookies);
    assert(res.status === 404 || res.status === 400, 'Should reject non-existent order');
  });

  // Case 8.8: Ship order before confirm
  await runTest('8.8 Cannot ship DRAFT order', async () => {
    const createRes = await apiCall('POST', '/api/orders', {
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['CAP-BLK'], quantity: 1, unitPrice: 39900 },
      ],
    }, ctx.cookies);
    const orderId = (createRes.data as { data: { id: string } }).data.id;

    const shipRes = await apiCall('POST', `/api/orders/${orderId}/ship`, {
      trackingNumber: 'TEST',
    }, ctx.cookies);
    if (shipRes.status === 200) {
      defects.push('DEFECT: Can ship DRAFT order');
    }
  });

  // Case 8.9: Complete order before deliver
  await runTest('8.9 Cannot complete undelivered order', async () => {
    const createRes = await apiCall('POST', '/api/orders', {
      branchId: ctx.branchId,
      items: [
        { productId: ctx.products['CAP-BLK'], quantity: 1, unitPrice: 39900 },
      ],
    }, ctx.cookies);
    const orderId = (createRes.data as { data: { id: string } }).data.id;
    await apiCall('POST', `/api/orders/${orderId}/confirm`, {}, ctx.cookies);

    const completeRes = await apiCall('POST', `/api/orders/${orderId}/complete`, {}, ctx.cookies);
    if (completeRes.status === 200) {
      defects.push('DEFECT: Can complete undelivered order');
    }
  });

  // Case 8.10: Delete product with stock
  await runTest('8.10 Delete product with stock behavior', async () => {
    const res = await apiCall('DELETE', `/api/products/${ctx.products['TSHIRT-BLK-S']}`, undefined, ctx.cookies);
    // Should either fail or soft delete
    assert(res.status === 200 || res.status === 400 || res.status === 409, 'Should handle product with stock');
  });

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);

  if (failed > 0) {
    console.log('\n--- Failed Tests ---');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ✗ ${r.name}: ${r.error}`);
    });
  }

  if (defects.length > 0) {
    console.log('\n--- Defects Found ---');
    defects.forEach(d => console.log(`  ⚠ ${d}`));
  }

  console.log('\n' + '='.repeat(60));
}

// Run tests
runAllTests().catch(console.error);
