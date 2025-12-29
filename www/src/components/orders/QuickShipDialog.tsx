import { useState } from 'react'
import { Truck } from 'lucide-react'
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
import { useShipOrder } from '@/features/orders'
import type { Order } from '@/features/orders'
import { formatCurrency } from '@/lib/utils'

const CARRIERS = [
  { value: 'THAI_POST', label: 'Thai Post' },
  { value: 'KERRY', label: 'Kerry Express' },
  { value: 'FLASH', label: 'Flash Express' },
  { value: 'JT', label: 'J&T Express' },
  { value: 'DHL', label: 'DHL' },
  { value: 'FEDEX', label: 'FedEx' },
  { value: 'OTHER', label: 'Other' },
]

interface QuickShipDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickShipDialog({ order, open, onOpenChange }: QuickShipDialogProps) {
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  const shipOrder = useShipOrder()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !carrier || !trackingNumber) return

    shipOrder.mutate(
      {
        id: order.id,
        data: {
          carrier,
          trackingNumber,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setCarrier('')
          setTrackingNumber('')
        },
      }
    )
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Ship Order
          </DialogTitle>
          <DialogDescription>
            Add shipping details for order {order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order</span>
              <span className="font-medium">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span>{order.customerName || 'Walk-in'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
            </div>
            {order.recipient?.address && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Ship to:</p>
                <p className="text-sm">{order.recipient.name}</p>
                <p className="text-sm">{order.recipient.address}</p>
              </div>
            )}
          </div>

          {/* Carrier Selection */}
          <div className="space-y-2">
            <Label htmlFor="carrier">Carrier</Label>
            <Combobox
              options={CARRIERS}
              value={carrier}
              onValueChange={setCarrier}
              placeholder="Select carrier"
              searchPlaceholder="Search carriers..."
            />
          </div>

          {/* Tracking Number */}
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={shipOrder.isPending}
              disabled={!carrier || !trackingNumber}
            >
              <Truck className="mr-2 h-4 w-4" />
              Ship Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
