import { useState, useMemo } from 'react'
import { Truck, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import { useCreatePurchaseOrder } from '@/features/purchase-orders'
import { useSuppliers } from '@/features/suppliers'
import { useProducts } from '@/features/products'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

interface QuickPODialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedProducts?: Array<{ productId: string; quantity: number }>
}

interface POItem {
  productId: string
  productName: string
  quantity: number
  unitCost: number
}

export function QuickPODialog({ open, onOpenChange, preselectedProducts }: QuickPODialogProps) {
  const [supplierId, setSupplierId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [items, setItems] = useState<POItem[]>(() =>
    preselectedProducts?.map((p) => ({
      productId: p.productId,
      productName: '',
      quantity: p.quantity,
      unitCost: 0,
    })) || []
  )

  const { branch, branches } = useAuthStore()
  const { data: suppliersData } = useSuppliers()
  const { data: productsData } = useProducts()
  const createPO = useCreatePurchaseOrder()

  // Default to current branch
  const effectiveBranchId = branchId || branch?.id || branches[0]?.id || ''

  const suppliers = suppliersData?.data || []
  const products = productsData?.data || []

  // Convert to Combobox options
  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  )

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.name,
        description: `SKU: ${p.sku} | ${formatCurrency(p.cost)}`,
      })),
    [products]
  )

  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name })),
    [branches]
  )

  const handleAddItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1, unitCost: 0 }])
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
      unitCost: product.cost,
    }
    setItems(newItems)
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items]
    newItems[index].quantity = Math.max(1, quantity)
    setItems(newItems)
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)

  const handleSubmit = () => {
    if (!supplierId || !effectiveBranchId || items.length === 0 || items.some((i) => !i.productId)) return

    createPO.mutate(
      {
        branchId: effectiveBranchId,
        supplierId,
        items: items.map((item) => ({
          productId: item.productId,
          qtyOrdered: item.quantity,
          unitCost: item.unitCost,
        })),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setSupplierId('')
          setBranchId('')
          setItems([])
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Quick Purchase Order
          </DialogTitle>
          <DialogDescription>Create a new purchase order quickly</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Branch Selection */}
          {branches.length > 1 && (
            <div className="space-y-2">
              <Label>Branch</Label>
              <Combobox
                options={branchOptions}
                value={effectiveBranchId}
                onValueChange={setBranchId}
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
              />
            </div>
          )}

          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Combobox
              options={supplierOptions}
              value={supplierId}
              onValueChange={setSupplierId}
              placeholder="Select supplier"
              searchPlaceholder="Search suppliers..."
              emptyText="No suppliers found"
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No items. Click "Add" to add products.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Combobox
                        options={productOptions}
                        value={item.productId}
                        onValueChange={(v) => handleProductSelect(index, v)}
                        placeholder="Select product"
                        searchPlaceholder="Search products..."
                        emptyText="No products found"
                      />
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {items.length > 0 && (
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Estimated Total</span>
              <span className="text-lg font-bold">{formatCurrency(total)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={createPO.isPending}
            disabled={!supplierId || !effectiveBranchId || items.length === 0 || items.some((i) => !i.productId)}
          >
            <Truck className="mr-2 h-4 w-4" />
            Create PO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
