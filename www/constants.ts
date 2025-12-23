import { Product, Organization, User, Transaction, Customer, Supplier, PurchaseOrder, Branch, StockLevel } from './types';

export const MOCK_ORGS: Organization[] = [
  { id: 'org_1', name: 'Siam Smile Shop', taxId: '1234567890123', address: 'Bangkok' },
  { id: 'org_2', name: 'Chiang Mai Crafts', taxId: '9876543210987', address: 'Chiang Mai' },
];

export const MOCK_BRANCHES: Branch[] = [
  { id: 'b1', orgId: 'org_1', name: 'Silom Warehouse', address: '123 Silom Rd', isMain: true },
  { id: 'b2', orgId: 'org_1', name: 'Siam Paragon Kiosk', address: 'Siam Paragon', isMain: false },
];

export const MOCK_USERS: User[] = [
  { id: 'u0', name: 'Super Admin', role: 'PLATFORM_ADMIN', orgId: 'org_1' },
  { id: 'u1', name: 'Admin Somchai', role: 'ORG_ADMIN', orgId: 'org_1' },
  { id: 'u2', name: 'Manager Wichai', role: 'BRANCH_MANAGER', orgId: 'org_1', branchId: 'b1' },
  { id: 'u3', name: 'Staff Nida', role: 'STAFF', orgId: 'org_1', branchId: 'b1' },
  { id: 'u4', name: 'Staff Lek', role: 'STAFF', orgId: 'org_1', branchId: 'b2' },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', orgId: 'org_1', name: 'John Doe', phone: '0812345678', points: 150, totalSpent: 4500, email: 'john@example.com' },
  { id: 'c2', orgId: 'org_1', name: 'Jane Smith', phone: '0898765432', points: 50, totalSpent: 1200 },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', orgId: 'org_1', name: 'Global Tea Imports', contactName: 'Mr. Chen', phone: '02-111-2222', email: 'orders@globaltea.com' },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', orgId: 'org_1', sku: 'SKU001', name: 'Thai Tea Mix', description: 'Authentic Thai Tea mix.', price: 150, cost: 80, category: 'Beverage', image: 'https://picsum.photos/200/200?random=1', weight: 500 },
  { id: 'p2', orgId: 'org_1', sku: 'SKU002', name: 'Coconut Oil 100%', description: 'Cold pressed.', price: 350, cost: 180, category: 'Health', image: 'https://picsum.photos/200/200?random=2', weight: 250 },
  { id: 'p3', orgId: 'org_1', sku: 'SKU003', name: 'Elephant Pants', description: 'Comfortable pants.', price: 200, cost: 80, category: 'Apparel', image: 'https://picsum.photos/200/200?random=3', weight: 150 },
  { id: 'p4', orgId: 'org_1', sku: 'SKU004', name: 'Mango Soap', description: 'Fruit shaped soap.', price: 50, cost: 15, category: 'Souvenir', image: 'https://picsum.photos/200/200?random=4', weight: 80 },
];

export const INITIAL_STOCK_LEVELS: StockLevel[] = [
  { productId: 'p1', branchId: 'b1', quantity: 45, minStock: 20, binLocation: 'A-01-01' },
  { productId: 'p1', branchId: 'b2', quantity: 10, minStock: 5, binLocation: 'Kiosk-Back' },
  { productId: 'p2', branchId: 'b1', quantity: 12, minStock: 15, binLocation: 'A-01-02' },
  { productId: 'p3', branchId: 'b1', quantity: 100, minStock: 10, binLocation: 'B-02-05' },
  { productId: 'p4', branchId: 'b1', quantity: 200, minStock: 50, binLocation: 'C-05-01' },
  { productId: 'p4', branchId: 'b2', quantity: 50, minStock: 10, binLocation: 'Kiosk-Front' },
];

const getDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'ORD-231001', orgId: 'org_1', branchId: 'b1', date: getDate(0), channel: 'POS', type: 'SALE', status: 'COMPLETED', fulfillmentStatus: 'SHIPPED', total: 450, userId: 'u3', paymentMethod: 'QR',
    items: [{ ...INITIAL_PRODUCTS[0], quantity: 3 }], recipientName: 'Walk-in Customer'
  },
  {
    id: 'SHP-998877', orgId: 'org_1', branchId: 'b1', date: getDate(0), channel: 'SHOPEE', type: 'SALE', status: 'COMPLETED', fulfillmentStatus: 'PENDING', total: 350, userId: 'SYSTEM', paymentMethod: 'TRANSFER',
    items: [{ ...INITIAL_PRODUCTS[1], quantity: 1 }], referenceId: '230922BVGX12', recipientName: 'user987_shopee', recipientAddress: '123 Condo One, Bangkok'
  },
  {
    id: 'LAZ-112233', orgId: 'org_1', branchId: 'b1', date: getDate(1), channel: 'LAZADA', type: 'SALE', status: 'COMPLETED', fulfillmentStatus: 'SHIPPED', total: 200, userId: 'SYSTEM', paymentMethod: 'COD',
    items: [{ ...INITIAL_PRODUCTS[2], quantity: 1 }], referenceId: '655331231', shippingInfo: { carrier: 'Kerry', trackingNumber: 'KERDO12345678' }, recipientName: 'Somchai Jaidee', recipientAddress: '55/9 Moo 3, Chiang Mai'
  }
];

export const MOCK_POS: PurchaseOrder[] = [
  {
    id: 'po-1', orgId: 'org_1', branchId: 'b1', referenceNo: 'PO-2023-001', date: new Date().toISOString(), supplierId: 's1', status: 'RECEIVED', totalCost: 1600,
    items: [{ productId: 'p1', productName: 'Thai Tea Mix', quantity: 20, unitCost: 80 }], receivedDate: new Date().toISOString()
  }
];

export const CATEGORIES = ['Beverage', 'Health', 'Apparel', 'Souvenir', 'Food', 'General'];