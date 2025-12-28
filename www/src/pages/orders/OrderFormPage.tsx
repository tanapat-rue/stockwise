import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Package, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { useOrder, useCreateOrder, useUpdateOrder } from '@/features/orders'
import { useProducts } from '@/features/products'
import { useCustomers } from '@/features/customers'
import { formatCurrency } from '@/lib/utils'

interface OrderLineItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number
}

export function OrderFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const { isLoading: orderLoading } = useOrder(id || '')
  const { data: productsData } = useProducts()
  const { data: customersData } = useCustomers()

  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()

  const products = productsData?.data || []
  const customers = customersData?.data || []

  // Convert to Combobox options
  const customerOptions: ComboboxOption[] = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.name,
        description: c.email || c.phone || undefined,
        icon: <User className="h-4 w-4 text-muted-foreground" />,
      })),
    [customers]
  )

  const productOptions: ComboboxOption[] = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.name,
        description: `SKU: ${p.sku} | ${formatCurrency(p.price)}`,
        icon: <Package className="h-4 w-4 text-muted-foreground" />,
      })),
    [products]
  )

  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState<OrderLineItem[]>([])
  const [notes, setNotes] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice - item.discount
  }, 0)
  const tax = Math.round(subtotal * 0.07) // 7% VAT
  const total = subtotal + tax

  const handleAddItem = () => {
    setItems([
      ...items,
      { productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0, discount: 0 },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      productId,
      productName: product.name,
      sku: product.sku,
      unitPrice: product.price,
    }
    setItems(newItems)
  }

  const handleItemChange = (index: number, field: keyof OrderLineItem, value: number | string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (items.length === 0) return

    const data = {
      customerId: customerId || undefined,
      customerName: customerName || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
      notes: notes || undefined,
      shippingAddress: shippingAddress || undefined,
    }

    if (isEditing) {
      updateOrder.mutate({ id, data })
    } else {
      createOrder.mutate(data)
    }
  }

  if (isEditing && orderLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Order' : 'New Order'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update order details' : 'Create a new customer order'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer */}
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Select Customer</Label>
                    <Combobox
                      options={customerOptions}
                      value={customerId}
                      onValueChange={setCustomerId}
                      placeholder="Search customers..."
                      searchPlaceholder="Type to search..."
                      emptyText="No customers found."
                      clearable
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Or Enter Name</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in customer name"
                      disabled={!!customerId}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added. Click "Add Item" to start.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                      <div className="col-span-5">Product</div>
                      <div className="col-span-2">Price</div>
                      <div className="col-span-2">Qty</div>
                      <div className="col-span-2">Total</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Items */}
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-5">
                          <Combobox
                            options={productOptions}
                            value={item.productId}
                            onValueChange={(v) => handleProductSelect(index, v)}
                            placeholder="Search products..."
                            searchPlaceholder="Type to search..."
                            emptyText="No products found."
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={item.unitPrice / 100}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                'unitPrice',
                                Math.round(parseFloat(e.target.value) * 100)
                              )
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div className="col-span-2 font-medium">
                          {formatCurrency(item.quantity * item.unitPrice - item.discount)}
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes & Shipping */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Shipping Address</Label>
                  <Input
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter shipping address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Order notes (optional)"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT (7%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={items.length === 0}
                    loading={createOrder.isPending || updateOrder.isPending}
                  >
                    {isEditing ? 'Update Order' : 'Create Order'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
