import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import {
  AppSettings,
  Branch,
  CartItem,
  Customer,
  FulfillmentStatus,
  HeldOrder,
  Organization,
  Product,
  PurchaseOrder,
  Role,
  StockLevel,
  Supplier,
  ToastMessage,
  Transaction,
  User,
} from '../types';

type ApiCtx = { orgId?: string; branchId?: string };

async function apiJson<T>(path: string, init?: RequestInit, ctx?: ApiCtx): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json');
  if (ctx?.orgId) headers.set('X-Org-Id', ctx.orgId);
  if (ctx?.branchId) headers.set('X-Branch-Id', ctx.branchId);

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error || body?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

async function apiForm<T>(path: string, form: FormData, ctx?: ApiCtx): Promise<T> {
  const headers = new Headers();
  if (ctx?.orgId) headers.set('X-Org-Id', ctx.orgId);
  if (ctx?.branchId) headers.set('X-Branch-Id', ctx.branchId);

  const res = await fetch(path, {
    method: 'POST',
    body: form,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error || body?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

interface AppContextType {
  // Auth & Multi-Tenancy
  user: User | null;
  allOrgs: Organization[];
  currentOrg: Organization | null;
  setCurrentOrgId: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: { orgName: string; name: string; email: string; password: string; taxId?: string; address?: string }) => Promise<void>;
  logout: () => Promise<void>;

  // Branch Management
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranchId: (id: string) => void;
  createBranch: (input: { name: string; address?: string; isMain?: boolean }) => Promise<void>;

  // User Management
  orgUsers: User[];
  refreshUsers: () => Promise<void>;
  createUser: (input: { name: string; email: string; password: string; role: Role; branchId?: string }) => Promise<void>;
  updateUser: (id: string, patch: Partial<Pick<User, 'name' | 'role' | 'branchId' | 'isActive'>>) => Promise<void>;

  // Inventory & Stock
  products: Product[];
  stockLevels: StockLevel[];

  getStock: (productId: string, branchId?: string) => number; // PHYSICAL on hand
  getAllocatedStock: (productId: string, branchId?: string) => number; // In PENDING/PICKED/PACKED orders
  getAvailableStock: (productId: string, branchId?: string) => number; // Physical - Allocated
  getStockLevel: (productId: string, branchId?: string) => StockLevel | undefined;

  addProduct: (product: Product) => Promise<Product | undefined>;
  updateProduct: (product: Product) => Promise<Product | undefined>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, quantity: number, type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT', note?: string) => Promise<void>;
  updateBinLocation: (productId: string, bin: string) => Promise<void>;
  uploadProductImage: (productId: string, file: File) => Promise<Product | undefined>;

  // Purchasing
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  createPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  receivePurchaseOrder: (poId: string) => Promise<void>;

  // POS
  cart: CartItem[];
  heldOrders: HeldOrder[];
  currentCustomer: Customer | null;
  setCustomerForOrder: (customer: Customer | null) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  holdOrder: (note?: string) => void;
  resumeOrder: (orderId: string) => void;
  deleteHeldOrder: (orderId: string) => void;
  checkout: (paymentMethod: 'CASH' | 'QR' | 'CARD', options?: { autoDeliver?: boolean }) => Promise<Transaction | undefined>;

  // Orders / OMS
  transactions: Transaction[];
  updateFulfillmentStatus: (transactionId: string, status: FulfillmentStatus, shippingInfo?: { carrier: string; trackingNumber: string }) => Promise<void>;
  bulkUpdateStatus: (transactionIds: string[], status: FulfillmentStatus) => Promise<void>;
  cancelOrder: (transactionId: string, reason: string, restock: boolean) => Promise<void>;

  // CRM
  customers: Customer[];
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // UX / Toasts
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const canAccessPurchasing = (role?: Role | null) =>
  role === 'PLATFORM_ADMIN' || role === 'ORG_ADMIN' || role === 'BRANCH_MANAGER';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [orgUsers, setOrgUsers] = useState<User[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  const [settings, setSettings] = useState<AppSettings>({
    language: 'en',
    currency: 'THB',
    themeColor: '#0ea5e9',
    isDark: false,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const currentOrgId = currentOrg?.id;
  const currentBranchId = currentBranch?.id;

  const apiCtx = useMemo<ApiCtx>(() => ({ orgId: currentOrgId || undefined, branchId: currentBranchId || undefined }), [currentOrgId, currentBranchId]);

  const isBootstrappingRef = useRef(false);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...newSettings };
      if (newSettings.isDark !== undefined) {
        if (newSettings.isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem('sf.settings', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Load settings from localStorage (fallback to OS preference for dark mode)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sf.settings');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        setSettings(prev => {
          const next = { ...prev, ...parsed };
          if (next.isDark) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return next;
        });
        return;
      }
    } catch {
      // ignore
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) updateSettings({ isDark: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetOrgScopedState = () => {
    setProducts([]);
    setStockLevels([]);
    setTransactions([]);
    setCustomers([]);
    setSuppliers([]);
    setPurchaseOrders([]);
    setOrgUsers([]);
    setCart([]);
    setHeldOrders([]);
    setCurrentCustomer(null);
  };

  const refreshOrgData = async (ctx: ApiCtx) => {
    const [productsRes, stockRes, customersRes, suppliersRes, poRes, txRes] = await Promise.allSettled([
      apiJson<{ products: Product[] }>('/api/products', undefined, ctx),
      apiJson<{ stockLevels: StockLevel[] }>('/api/stock-levels', undefined, ctx),
      apiJson<{ customers: Customer[] }>('/api/customers', undefined, ctx),
      apiJson<{ suppliers: Supplier[] }>('/api/suppliers', undefined, ctx),
      apiJson<{ purchaseOrders: PurchaseOrder[] }>('/api/purchase-orders', undefined, ctx),
      apiJson<{ transactions: Transaction[] }>('/api/transactions', undefined, ctx),
    ]);

    const normalizeProduct = (p: Product): Product => {
      const image = p.imageKey ? `/api/products/${p.id}/image` : p.image;
      return { ...p, image };
    };

    if (productsRes.status === 'fulfilled') setProducts((productsRes.value.products || []).map(normalizeProduct));
    if (stockRes.status === 'fulfilled') setStockLevels(stockRes.value.stockLevels || []);
    if (customersRes.status === 'fulfilled') setCustomers(customersRes.value.customers || []);
    if (txRes.status === 'fulfilled') setTransactions(txRes.value.transactions || []);

    // Only set purchasing data if user is allowed; otherwise keep empty without noise.
    if (suppliersRes.status === 'fulfilled') setSuppliers(suppliersRes.value.suppliers || []);
    else setSuppliers([]);

    if (poRes.status === 'fulfilled') setPurchaseOrders(poRes.value.purchaseOrders || []);
    else setPurchaseOrders([]);
  };

  const refreshOrgsAndBranches = async (baseUser: User): Promise<ApiCtx> => {
    const orgsRes = await apiJson<{ orgs: Organization[] }>('/api/orgs');
    const orgs = orgsRes.orgs || [];
    setAllOrgs(orgs);

    let nextOrgId = baseUser.orgId;
    if (baseUser.role === 'PLATFORM_ADMIN') {
      const saved = localStorage.getItem('sf.currentOrgId');
      if (saved && orgs.some(o => o.id === saved)) nextOrgId = saved;
      else if (orgs[0]?.id) nextOrgId = orgs[0].id;
    }

    const nextOrg = orgs.find(o => o.id === nextOrgId) || null;
    setCurrentOrg(nextOrg);
    if (nextOrg?.id) localStorage.setItem('sf.currentOrgId', nextOrg.id);

    const branchesRes = await apiJson<{ branches: Branch[] }>('/api/branches', undefined, { orgId: nextOrgId });
    const brs = branchesRes.branches || [];
    setBranches(brs);

    let nextBranchId: string | null = null;
    if (baseUser.branchId) {
      nextBranchId = baseUser.branchId;
    } else {
      const savedBranch = localStorage.getItem('sf.currentBranchId');
      if (savedBranch && brs.some(b => b.id === savedBranch)) nextBranchId = savedBranch;
      else nextBranchId = brs.find(b => b.isMain)?.id || brs[0]?.id || null;
    }

    const nextBranch = brs.find(b => b.id === nextBranchId) || null;
    setCurrentBranch(nextBranch);
    if (nextBranch?.id) localStorage.setItem('sf.currentBranchId', nextBranch.id);

    await refreshOrgData({ orgId: nextOrgId, branchId: nextBranchId || undefined });
    return { orgId: nextOrgId, branchId: nextBranchId || undefined };
  };

  const refreshUsers = async (overrideUser?: User | null, overrideCtx?: ApiCtx) => {
    const activeUser = overrideUser ?? user;
    const ctx = overrideCtx ?? apiCtx;

    if (!activeUser) {
      setOrgUsers([]);
      return;
    }
    if (!(activeUser.role === 'PLATFORM_ADMIN' || activeUser.role === 'ORG_ADMIN')) {
      setOrgUsers([]);
      return;
    }
    try {
      const res = await apiJson<{ users: User[] }>('/api/users', undefined, ctx);
      setOrgUsers(res.users || []);
    } catch {
      setOrgUsers([]);
    }
  };

  // Bootstrap session (if cookie exists)
  useEffect(() => {
    const bootstrap = async () => {
      if (isBootstrappingRef.current) return;
      isBootstrappingRef.current = true;
      try {
        const me = await apiJson<{ user: User }>('/api/auth/me');
        setUser(me.user);
        const ctx = await refreshOrgsAndBranches(me.user);
        await refreshUsers(me.user, ctx);
      } catch {
        // not logged in
        setUser(null);
      } finally {
        isBootstrappingRef.current = false;
      }
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiJson<{ user: User }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      undefined,
    );
    setUser(res.user);
    const ctx = await refreshOrgsAndBranches(res.user);
    await refreshUsers(res.user, ctx);
    showToast('success', 'Logged in');
  };

  const signup = async (input: { orgName: string; name: string; email: string; password: string; taxId?: string; address?: string }) => {
    const res = await apiJson<{ user: User; org?: Organization; branch?: Branch }>(
      '/api/auth/signup',
      { method: 'POST', body: JSON.stringify(input) },
      undefined,
    );
    setUser(res.user);
    const ctx = await refreshOrgsAndBranches(res.user);
    await refreshUsers(res.user, ctx);
    showToast('success', 'Organization created');
  };

  const logout = async () => {
    try {
      await apiJson('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    setAllOrgs([]);
    setBranches([]);
    setCurrentOrg(null);
    setCurrentBranch(null);
    resetOrgScopedState();
    showToast('info', 'Logged out');
  };

  const setCurrentOrgId = (id: string) => {
    const next = allOrgs.find(o => o.id === id) || null;
    setCurrentOrg(next);
    if (id) localStorage.setItem('sf.currentOrgId', id);

    // Reset branch & org data, then refetch.
    (async () => {
      try {
        resetOrgScopedState();
        const branchesRes = await apiJson<{ branches: Branch[] }>('/api/branches', undefined, { orgId: id });
        const brs = branchesRes.branches || [];
        setBranches(brs);

        const nextBranchId = brs.find(b => b.isMain)?.id || brs[0]?.id || null;
        const nextBranch = brs.find(b => b.id === nextBranchId) || null;
        setCurrentBranch(nextBranch);
        if (nextBranch?.id) localStorage.setItem('sf.currentBranchId', nextBranch.id);

        const ctx = { orgId: id, branchId: nextBranchId || undefined };
        await refreshOrgData(ctx);
        await refreshUsers(undefined, ctx);
      } catch (e: any) {
        showToast('error', e?.message || 'Failed to switch org');
      }
    })();
  };

  const setCurrentBranchId = (id: string) => {
    const next = branches.find(b => b.id === id) || null;
    setCurrentBranch(next);
    if (id) localStorage.setItem('sf.currentBranchId', id);
  };

  const createBranch = async (input: { name: string; address?: string; isMain?: boolean }) => {
    await apiJson(
      '/api/branches',
      { method: 'POST', body: JSON.stringify({ name: input.name, address: input.address, isMain: !!input.isMain }) },
      apiCtx,
    );
    const branchesRes = await apiJson<{ branches: Branch[] }>('/api/branches', undefined, apiCtx);
    setBranches(branchesRes.branches || []);
    showToast('success', 'Branch created');
  };

  const createUser = async (input: { name: string; email: string; password: string; role: Role; branchId?: string }) => {
    await apiJson(
      '/api/users',
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          password: input.password,
          role: input.role,
          branchId: input.branchId,
        }),
      },
      apiCtx,
    );
    await refreshUsers();
    showToast('success', 'User created');
  };

  const updateUser = async (id: string, patch: Partial<Pick<User, 'name' | 'role' | 'branchId' | 'isActive'>>) => {
    await apiJson(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, apiCtx);
    await refreshUsers();
    showToast('success', 'User updated');
  };

  // --- Stock helpers ---
  const getStockLevel = (productId: string, branchId?: string) => {
    const targetBranchId = branchId || currentBranchId;
    if (!targetBranchId) return undefined;
    return stockLevels.find(s => s.productId === productId && s.branchId === targetBranchId);
  };

  const getStock = (productId: string, branchId?: string): number => {
    const s = getStockLevel(productId, branchId);
    return s ? s.quantity : 0;
  };

  const getAllocatedStock = (productId: string, branchId?: string): number => {
    const targetBranchId = branchId || currentBranchId;
    if (!targetBranchId) return 0;

    const active = transactions.filter(
      t => t.branchId === targetBranchId && t.type === 'SALE' && ['PENDING', 'PICKED', 'PACKED', 'SHIPPED'].includes(t.fulfillmentStatus),
    );

    return active.reduce((sum, t) => {
      const item = t.items.find(i => i.id === productId);
      return sum + (item ? item.quantity : 0);
    }, 0);
  };

  const getAvailableStock = (productId: string, branchId?: string): number => {
    const physical = getStock(productId, branchId);
    const allocated = getAllocatedStock(productId, branchId);
    return physical - allocated;
  };

  // --- Inventory & Warehouse Actions ---
  const addProduct = async (product: Product): Promise<Product | undefined> => {
    const created = await apiJson<{ product: Product }>(
      '/api/products',
      {
        method: 'POST',
        body: JSON.stringify({
          sku: product.sku,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          image: product.image,
          weight: product.weight,
          dimensions: product.dimensions,
        }),
      },
      apiCtx,
    );
    const normalized = { ...created.product, image: created.product.imageKey ? `/api/products/${created.product.id}/image` : created.product.image };
    setProducts(prev => [normalized, ...prev]);
    showToast('success', 'Product added');
    return normalized;
  };

  const updateProduct = async (product: Product): Promise<Product | undefined> => {
    const updated = await apiJson<{ product: Product }>(
      `/api/products/${product.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          sku: product.sku,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          image: product.image,
          weight: product.weight,
          dimensions: product.dimensions,
        }),
      },
      apiCtx,
    );
    const normalized = { ...updated.product, image: updated.product.imageKey ? `/api/products/${updated.product.id}/image` : updated.product.image };
    setProducts(prev => prev.map(p => (p.id === normalized.id ? normalized : p)));
    showToast('success', 'Product updated');
    return normalized;
  };

  const deleteProduct = async (id: string) => {
    await apiJson(`/api/products/${id}`, { method: 'DELETE' }, apiCtx);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast('info', 'Product deleted');
  };

  const adjustStock = async (productId: string, quantity: number, type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT', note?: string) => {
    const res = await apiJson<{ stockLevel: StockLevel; transaction?: Transaction }>(
      '/api/stock/adjust',
      { method: 'POST', body: JSON.stringify({ productId, quantity, type, note }) },
      apiCtx,
    );

    setStockLevels(prev => {
      const idx = prev.findIndex(s => s.productId === res.stockLevel.productId && s.branchId === res.stockLevel.branchId);
      if (idx < 0) return [...prev, res.stockLevel];
      const next = [...prev];
      next[idx] = res.stockLevel;
      return next;
    });

    if (res.transaction) setTransactions(prev => [res.transaction as any, ...prev]);
    showToast('success', 'Stock updated');
  };

  const updateBinLocation = async (productId: string, bin: string) => {
    if (!currentBranchId) return;
    const res = await apiJson<{ stockLevel: StockLevel }>(
      `/api/stock-levels/${productId}`,
      { method: 'PATCH', body: JSON.stringify({ branchId: currentBranchId, binLocation: bin }) },
      apiCtx,
    );
    setStockLevels(prev => {
      const idx = prev.findIndex(s => s.productId === res.stockLevel.productId && s.branchId === res.stockLevel.branchId);
      if (idx < 0) return [...prev, res.stockLevel];
      const next = [...prev];
      next[idx] = res.stockLevel;
      return next;
    });
    showToast('success', 'Location updated');
  };

  const uploadProductImage = async (productId: string, file: File): Promise<Product | undefined> => {
    if (!productId) return;
    const form = new FormData();
    form.append('file', file);
    const res = await apiForm<{ product: Product }>(`/api/products/${productId}/image`, form, apiCtx);
    const normalized = { ...res.product, image: res.product.imageKey ? `/api/products/${res.product.id}/image` : res.product.image };
    setProducts(prev => prev.map(p => (p.id === normalized.id ? normalized : p)));
    showToast('success', 'Image uploaded');
    return normalized;
  };

  // --- CRM ---
  const addCustomer = async (customer: Customer) => {
    const res = await apiJson<{ customer: Customer }>(
      '/api/customers',
      {
        method: 'POST',
        body: JSON.stringify({ name: customer.name, phone: customer.phone, email: customer.email, address: customer.address }),
      },
      apiCtx,
    );
    setCustomers(prev => [res.customer, ...prev]);
    showToast('success', 'Customer added');
  };

  const updateCustomer = async (customer: Customer) => {
    const res = await apiJson<{ customer: Customer }>(
      `/api/customers/${customer.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name: customer.name, phone: customer.phone, email: customer.email, address: customer.address }),
      },
      apiCtx,
    );
    setCustomers(prev => prev.map(c => (c.id === res.customer.id ? res.customer : c)));
    showToast('success', 'Customer updated');
  };

  const addSupplier = async (supplier: Supplier) => {
    const res = await apiJson<{ supplier: Supplier }>(
      '/api/suppliers',
      {
        method: 'POST',
        body: JSON.stringify({
          name: supplier.name,
          contactName: supplier.contactName,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          taxId: supplier.taxId,
        }),
      },
      apiCtx,
    );
    setSuppliers(prev => [res.supplier, ...prev]);
    showToast('success', 'Supplier added');
  };

  const updateSupplier = async (supplier: Supplier) => {
    const res = await apiJson<{ supplier: Supplier }>(
      `/api/suppliers/${supplier.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: supplier.name,
          contactName: supplier.contactName,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          taxId: supplier.taxId,
        }),
      },
      apiCtx,
    );
    setSuppliers(prev => prev.map(s => (s.id === res.supplier.id ? res.supplier : s)));
    showToast('success', 'Supplier updated');
  };

  // --- Purchasing ---
  const createPurchaseOrder = async (po: PurchaseOrder) => {
    await apiJson(
      '/api/purchase-orders',
      {
        method: 'POST',
        body: JSON.stringify({
          referenceNo: po.referenceNo,
          supplierId: po.supplierId,
          branchId: po.branchId,
          items: po.items,
          note: po.note,
        }),
      },
      apiCtx,
    );
    await refreshOrgData(apiCtx);
    showToast('success', 'Purchase Order created');
  };

  const receivePurchaseOrder = async (poId: string) => {
    await apiJson(`/api/purchase-orders/${poId}/receive`, { method: 'POST' }, apiCtx);
    await refreshOrgData(apiCtx);
    showToast('success', 'Purchase Order received');
  };

  // --- POS ---
  const setCustomerForOrder = (customer: Customer | null) => setCurrentCustomer(customer);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.id !== productId));

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => (item.id === productId ? { ...item, quantity } : item)));
  };

  const clearCart = () => {
    setCart([]);
    setCurrentCustomer(null);
  };

  const holdOrder = (note?: string) => {
    if (cart.length === 0) return;
    const newHold: HeldOrder = {
      id: `hold-${Date.now()}`,
      items: [...cart],
      customer: currentCustomer,
      timestamp: new Date().toISOString(),
      note,
    };
    setHeldOrders(prev => [newHold, ...prev]);
    clearCart();
    showToast('info', 'Order put on hold');
  };

  const resumeOrder = (orderId: string) => {
    const order = heldOrders.find(o => o.id === orderId);
    if (!order) return;
    setCart(order.items);
    setCurrentCustomer(order.customer);
    setHeldOrders(prev => prev.filter(o => o.id !== orderId));
    showToast('info', 'Order resumed');
  };

  const deleteHeldOrder = (orderId: string) => {
    setHeldOrders(prev => prev.filter(o => o.id !== orderId));
    showToast('info', 'Held order deleted');
  };

  const checkout = async (paymentMethod: 'CASH' | 'QR' | 'CARD', options?: { autoDeliver?: boolean }): Promise<Transaction | undefined> => {
    if (!user || !currentOrgId || !currentBranchId || cart.length === 0) return;

    const res = await apiJson<{ transaction: Transaction }>(
      '/api/checkout',
      {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.id, quantity: i.quantity })),
          customerId: currentCustomer?.id,
          paymentMethod,
          autoDeliver: !!options?.autoDeliver,
        }),
      },
      apiCtx,
    );

    // Optimistic local update: transactions only.
    setTransactions(prev => [res.transaction as any, ...prev]);

    clearCart();
    showToast('success', options?.autoDeliver ? 'Order delivered' : 'Order created (pending)');

    // Refresh in background to sync totals/points/etc.
    refreshOrgData(apiCtx).catch(() => {});
    return res.transaction;
  };

  // --- Orders / OMS ---
  const updateFulfillmentStatus = async (
    transactionId: string,
    status: FulfillmentStatus,
    shippingInfo?: { carrier: string; trackingNumber: string },
  ) => {
    await apiJson(
      `/api/orders/${transactionId}/fulfillment`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          carrier: shippingInfo?.carrier,
          trackingNumber: shippingInfo?.trackingNumber,
        }),
      },
      apiCtx,
    );
    await refreshOrgData(apiCtx);
    showToast('success', `Order status updated to ${status}`);
  };

  const bulkUpdateStatus = async (transactionIds: string[], status: FulfillmentStatus) => {
    await apiJson(
      '/api/orders/bulk-status',
      { method: 'POST', body: JSON.stringify({ ids: transactionIds, status }) },
      apiCtx,
    );
    await refreshOrgData(apiCtx);
    showToast('success', `${transactionIds.length} orders updated`);
  };

  const cancelOrder = async (transactionId: string, reason: string, restock: boolean) => {
    await apiJson(
      `/api/orders/${transactionId}/cancel`,
      { method: 'POST', body: JSON.stringify({ reason, restock }) },
      apiCtx,
    );
    await refreshOrgData(apiCtx);
    showToast('info', `Order ${transactionId} cancelled`);
  };

  const value: AppContextType = {
    user,
    allOrgs,
    currentOrg,
    setCurrentOrgId,
    login,
    signup,
    logout,

    branches,
    currentBranch,
    setCurrentBranchId,
    createBranch,

    orgUsers,
    refreshUsers,
    createUser,
    updateUser,

    products,
    stockLevels,
    getStock,
    getAllocatedStock,
    getAvailableStock,
    getStockLevel,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    updateBinLocation,
    uploadProductImage,

    suppliers: canAccessPurchasing(user?.role) ? suppliers : [],
    purchaseOrders: canAccessPurchasing(user?.role) ? purchaseOrders : [],
    addSupplier,
    updateSupplier,
    createPurchaseOrder,
    receivePurchaseOrder,

    cart,
    heldOrders,
    currentCustomer,
    setCustomerForOrder,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    holdOrder,
    resumeOrder,
    deleteHeldOrder,
    checkout,

    transactions,
    updateFulfillmentStatus,
    bulkUpdateStatus,
    cancelOrder,

    customers,
    addCustomer,
    updateCustomer,

    settings,
    updateSettings,

    toasts,
    showToast,
    removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
