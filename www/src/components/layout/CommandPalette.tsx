import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  Truck,
  BarChart3,
  Settings,
  Boxes,
  RotateCcw,
  FileText,
  Plus,
  Search,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useUIStore } from '@/stores/ui-store'
import { useProducts } from '@/features/products'
import { useCustomers } from '@/features/customers'
import { useSuppliers } from '@/features/suppliers'
import { useOrders } from '@/features/orders'

const pages = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'main'] },
  { name: 'Products', href: '/products', icon: Package, keywords: ['items', 'catalog'] },
  { name: 'Stock', href: '/stock', icon: Boxes, keywords: ['inventory', 'warehouse'] },
  { name: 'Orders', href: '/orders', icon: ShoppingCart, keywords: ['sales', 'transactions'] },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList, keywords: ['po', 'buying'] },
  { name: 'Customers', href: '/customers', icon: Users, keywords: ['clients', 'buyers'] },
  { name: 'Suppliers', href: '/suppliers', icon: Truck, keywords: ['vendors', 'providers'] },
  { name: 'Returns', href: '/returns', icon: RotateCcw, keywords: ['refund', 'exchange'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, keywords: ['analytics', 'stats'] },
  { name: 'Documents', href: '/documents', icon: FileText, keywords: ['files', 'invoices'] },
  { name: 'Settings', href: '/settings', icon: Settings, keywords: ['preferences', 'config'] },
]

const quickActions = [
  { name: 'New Order', href: '/orders/new', icon: Plus, keywords: ['create order', 'add sale'] },
  { name: 'New Purchase Order', href: '/purchase-orders/new', icon: Plus, keywords: ['create po', 'add purchase'] },
  { name: 'Add Product', href: '/products', action: 'add-product', icon: Plus, keywords: ['create product'] },
  { name: 'Add Customer', href: '/customers', action: 'add-customer', icon: Plus, keywords: ['create customer'] },
]

export function CommandPalette() {
  const navigate = useNavigate()
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const [search, setSearch] = useState('')

  // Fetch data for search
  const { data: productsData } = useProducts()
  const { data: customersData } = useCustomers()
  const { data: suppliersData } = useSuppliers()
  const { data: ordersData } = useOrders()

  const products = productsData?.data || []
  const customers = customersData?.data || []
  const suppliers = suppliersData?.data || []
  const orders = ordersData?.data || []

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  const runCommand = useCallback(
    (command: () => void) => {
      setCommandPaletteOpen(false)
      command()
    },
    [setCommandPaletteOpen]
  )

  const handleSelect = (href: string) => {
    runCommand(() => navigate(href))
  }

  // Filter results based on search
  const filteredProducts = search.length > 1
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : []

  const filteredCustomers = search.length > 1
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : []

  const filteredSuppliers = search.length > 1
    ? suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : []

  const filteredOrders = search.length > 1
    ? orders.filter(o =>
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5)
    : []

  const hasResults = filteredProducts.length > 0 ||
    filteredCustomers.length > 0 ||
    filteredSuppliers.length > 0 ||
    filteredOrders.length > 0

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput
        placeholder="Search pages, products, orders..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p>No results found.</p>
            <p className="text-xs text-muted-foreground">Try a different search term</p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        {!search && (
          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => (
              <CommandItem
                key={action.name}
                value={action.name}
                onSelect={() => handleSelect(action.href)}
              >
                <action.icon className="mr-2 h-4 w-4" />
                <span>{action.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Pages */}
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              value={`${page.name} ${page.keywords.join(' ')}`}
              onSelect={() => handleSelect(page.href)}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Search Results */}
        {hasResults && <CommandSeparator />}

        {/* Products */}
        {filteredProducts.length > 0 && (
          <CommandGroup heading="Products">
            {filteredProducts.map((product) => (
              <CommandItem
                key={product.id}
                value={`product ${product.name} ${product.sku}`}
                onSelect={() => handleSelect(`/products`)}
              >
                <Package className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{product.name}</span>
                  <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Orders */}
        {filteredOrders.length > 0 && (
          <CommandGroup heading="Orders">
            {filteredOrders.map((order) => (
              <CommandItem
                key={order.id}
                value={`order ${order.orderNumber} ${order.customerName}`}
                onSelect={() => handleSelect(`/orders/${order.id}`)}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{order.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">{order.customerName}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Customers */}
        {filteredCustomers.length > 0 && (
          <CommandGroup heading="Customers">
            {filteredCustomers.map((customer) => (
              <CommandItem
                key={customer.id}
                value={`customer ${customer.name} ${customer.code}`}
                onSelect={() => handleSelect(`/customers`)}
              >
                <Users className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{customer.name}</span>
                  {customer.phone && (
                    <span className="text-xs text-muted-foreground">{customer.phone}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Suppliers */}
        {filteredSuppliers.length > 0 && (
          <CommandGroup heading="Suppliers">
            {filteredSuppliers.map((supplier) => (
              <CommandItem
                key={supplier.id}
                value={`supplier ${supplier.name} ${supplier.code}`}
                onSelect={() => handleSelect(`/suppliers`)}
              >
                <Truck className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{supplier.name}</span>
                  {supplier.phone && (
                    <span className="text-xs text-muted-foreground">{supplier.phone}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
