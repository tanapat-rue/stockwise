import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Truck,
  CheckCircle,
  XCircle,
  Package,
  CreditCard,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useOrder,
  useConfirmOrder,
  useDeliverOrder,
  useCancelOrder,
} from '@/features/orders'
import type { OrderStatus, FulfillmentStatus } from '@/features/orders'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { QuickShipDialog } from '@/components/orders/QuickShipDialog'

const statusColors: Record<OrderStatus, string> = {
  DRAFT: 'secondary',
  PENDING: 'warning',
  CONFIRMED: 'default',
  PROCESSING: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  REFUNDED: 'destructive',
}

const fulfillmentColors: Record<FulfillmentStatus, string> = {
  PENDING: 'warning',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  RETURNED: 'destructive',
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showShipDialog, setShowShipDialog] = useState(false)

  const { data: orderData, isLoading } = useOrder(id || '')
  const confirmOrder = useConfirmOrder()
  const deliverOrder = useDeliverOrder()
  const cancelOrder = useCancelOrder()

  const order = orderData?.data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found</p>
        <Button asChild className="mt-4">
          <Link to="/orders">Back to Orders</Link>
        </Button>
      </div>
    )
  }

  const canEdit = order.status === 'DRAFT' || order.status === 'PENDING'
  const canConfirm = order.status === 'PENDING'
  const canShip = order.fulfillmentStatus === 'PENDING' || order.fulfillmentStatus === 'PROCESSING'
  const canDeliver = order.fulfillmentStatus === 'SHIPPED'
  const canCancel = !['CANCELLED', 'COMPLETED', 'REFUNDED'].includes(order.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{order.orderNumber}</h1>
              <Badge variant={statusColors[order.status] as 'default'} className="text-sm">
                {order.status.replace('_', ' ')}
              </Badge>
              <Badge variant={fulfillmentColors[order.fulfillmentStatus] as 'default'} className="text-sm">
                {order.fulfillmentStatus.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-muted-foreground">Created {formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link to={`/orders/${order.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {canConfirm && (
            <Button onClick={() => confirmOrder.mutate(order.id)} loading={confirmOrder.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm
            </Button>
          )}
          {canShip && (
            <Button onClick={() => setShowShipDialog(true)}>
              <Truck className="mr-2 h-4 w-4" />
              Ship
            </Button>
          )}
          {canDeliver && (
            <Button onClick={() => deliverOrder.mutate(order.id)} loading={deliverOrder.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Delivered
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => cancelOrder.mutate({ id: order.id, data: {} })}
              loading={cancelOrder.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{order.customerName || 'Walk-in'}</span>
                </div>
                {order.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{order.customerPhone}</span>
                  </div>
                )}
                {order.customerEmail && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{order.customerEmail}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">{item.productSku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.lineTotal)}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-medium text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Info */}
          {(order.recipient?.address || order.shipping?.trackingNumber) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.recipient && (
                  <div>
                    <p className="text-sm text-muted-foreground">Recipient</p>
                    <p className="font-medium">{order.recipient.name}</p>
                    {order.recipient.phone && <p className="text-sm">{order.recipient.phone}</p>}
                    {order.recipient.address && <p className="text-sm">{order.recipient.address}</p>}
                  </div>
                )}
                {order.shipping?.carrier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carrier</span>
                    <span>{order.shipping.carrier}</span>
                  </div>
                )}
                {order.shipping?.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking</span>
                    <span className="font-mono">{order.shipping.trackingNumber}</span>
                  </div>
                )}
                {order.shipping?.shippedDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipped</span>
                    <span>{formatDate(order.shipping.shippedDate)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    order.paymentStatus === 'PAID'
                      ? 'success'
                      : order.paymentStatus === 'PARTIAL'
                        ? 'warning'
                        : 'secondary'
                  }
                >
                  {order.paymentStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Remaining</span>
                <span>{formatCurrency(order.dueAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.internalNote && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.internalNote}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Ship Dialog */}
      <QuickShipDialog
        order={order}
        open={showShipDialog}
        onOpenChange={setShowShipDialog}
      />
    </div>
  )
}
