import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Package, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { usePurchaseOrder, useCreatePurchaseOrder, useUpdatePurchaseOrder } from '@/features/purchase-orders'
import { useProducts } from '@/features/products'
import { useSuppliers } from '@/features/suppliers'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

interface POLineItem {
  productId: string
  productName: string
  productSku: string
  qtyOrdered: number
  unitCost: number
}

export function PurchaseOrderFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const { branch, branches } = useAuthStore()
  const { data: poData, isLoading: poLoading } = usePurchaseOrder(id || '')
  const { data: productsData } = useProducts()
  const { data: suppliersData } = useSuppliers()

  const createPO = useCreatePurchaseOrder()
  const updatePO = useUpdatePurchaseOrder()

  const products = productsData?.data || []
  const suppliers = suppliersData?.data || []

  // Convert to Combobox options
  const supplierOptions: ComboboxOption[] = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        description: s.email || s.phone || undefined,
        icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
      })),
    [suppliers]
  )

  const productOptions: ComboboxOption[] = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.name,
        description: `SKU: ${p.sku} | Cost: ${formatCurrency(p.cost)}`,
        icon: <Package className="h-4 w-4 text-muted-foreground" />,
      })),
    [products]
  )

  const [branchId, setBranchId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<POLineItem[]>([])
  const [notes, setNotes] = useState('')
  const [expectedDate, setExpectedDate] = useState('')

  // Default branchId
  const effectiveBranchId = branchId || branch?.id || branches[0]?.id || ''

  // Load existing PO data
  useEffect(() => {
    if (poData?.data && isEditing) {
      const po = poData.data
      setBranchId(po.branchId)
      setSupplierId(po.supplierId)
      setNotes(po.notes || '')
      setExpectedDate(po.expectedDeliveryDate?.split('T')[0] || '')
      setItems(
        po.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          qtyOrdered: item.qtyOrdered,
          unitCost: item.unitCost,
        }))
      )
    }
  }, [poData, isEditing])

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.qtyOrdered * item.unitCost, 0)
  const tax = Math.round(subtotal * 0.07)
  const total = subtotal + tax

  const handleAddItem = () => {
    setItems([
      ...items,
      { productId: '', productName: '', productSku: '', qtyOrdered: 1, unitCost: 0 },
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
      productSku: product.sku,
      unitCost: product.cost,
    }
    setItems(newItems)
  }

  const handleItemChange = (index: number, field: keyof POLineItem, value: number | string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!supplierId || !effectiveBranchId || items.length === 0) return

    const data = {
      branchId: effectiveBranchId,
      supplierId,
      items: items.map((item) => ({
        productId: item.productId,
        qtyOrdered: item.qtyOrdered,
        unitCost: item.unitCost,
      })),
      notes: notes || undefined,
      expectedDeliveryDate: expectedDate || undefined,
    }

    if (isEditing) {
      updatePO.mutate({ id, data })
    } else {
      createPO.mutate(data)
    }
  }

  if (isEditing && poLoading) {
    return <div>Loading...</div>
  }

  const po = poData?.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? po?.orderNumber || 'Edit PO' : 'New Purchase Order'}
            </h1>
            {po && (
              <Badge variant={po.status === 'RECEIVED' ? 'success' : 'default'}>
                {po.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isEditing ? 'Update purchase order details' : 'Create a new purchase order'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Supplier */}
            <Card>
              <CardHeader>
                <CardTitle>Supplier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {branches.length > 1 && (
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select value={effectiveBranchId} onValueChange={setBranchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Select Supplier</Label>
                  <Combobox
                    options={supplierOptions}
                    value={supplierId}
                    onValueChange={setSupplierId}
                    placeholder="Search suppliers..."
                    searchPlaceholder="Type to search..."
                    emptyText="No suppliers found."
                    clearable
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Date</Label>
                  <Input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
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
                      <div className="col-span-2">Cost</div>
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
                            value={item.unitCost / 100}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                'unitCost',
                                Math.round(parseFloat(e.target.value || '0') * 100)
                              )
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.qtyOrdered}
                            onChange={(e) =>
                              handleItemChange(index, 'qtyOrdered', parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div className="col-span-2 font-medium">
                          {formatCurrency(item.qtyOrdered * item.unitCost)}
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

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes (optional)"
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>PO Summary</CardTitle>
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
                    disabled={!supplierId || !effectiveBranchId || items.length === 0}
                    loading={createPO.isPending || updatePO.isPending}
                  >
                    {isEditing ? 'Update PO' : 'Create PO'}
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
