import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Edit,
  Printer,
  MoreVertical,
  Package,
  Truck,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useOrder,
  useOrderTimeline,
  useConfirmOrder,
  useCompleteOrder,
  useCancelOrder,
  useRecordPayment,
  useMarkShipped,
  useMarkDelivered,
  orderStatusLabels,
  orderStatusColors,
  fulfillmentStatusLabels,
  paymentStatusLabels,
  paymentStatusColors,
  salesChannelLabels,
  paymentMethods,
} from '@/features/orders';
import type { OrderStatus, FulfillmentStatus, PaymentStatus } from '@/features/orders';
import { formatCurrency } from '@/lib/utils';

function StatusBadge({ status, type }: { status: string; type: 'order' | 'fulfillment' | 'payment' }) {
  if (type === 'order') {
    return (
      <Badge variant={orderStatusColors[status as OrderStatus] || 'secondary'}>
        {orderStatusLabels[status as OrderStatus] || status}
      </Badge>
    );
  }
  if (type === 'payment') {
    return (
      <Badge variant={paymentStatusColors[status as PaymentStatus] || 'secondary'}>
        {paymentStatusLabels[status as PaymentStatus] || status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      {fulfillmentStatusLabels[status as FulfillmentStatus] || status}
    </Badge>
  );
}

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useOrder(id || '');
  const { data: timeline } = useOrderTimeline(id || '');

  const confirmOrder = useConfirmOrder();
  const completeOrder = useCompleteOrder();
  const cancelOrder = useCancelOrder();
  const recordPayment = useRecordPayment();
  const markShipped = useMarkShipped();
  const markDelivered = useMarkDelivered();

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // Shipping dialog
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleRecordPayment = () => {
    if (!id || !paymentAmount) return;
    recordPayment.mutate(
      {
        id,
        method: paymentMethod,
        amount: parseFloat(paymentAmount),
        reference: paymentReference || undefined,
      },
      {
        onSuccess: () => {
          setPaymentDialogOpen(false);
          setPaymentAmount('');
          setPaymentReference('');
        },
      }
    );
  };

  const handleMarkShipped = () => {
    if (!id) return;
    markShipped.mutate(
      { id, trackingNumber: trackingNumber || undefined },
      {
        onSuccess: () => {
          setShippingDialogOpen(false);
          setTrackingNumber('');
        },
      }
    );
  };

  const handleCancel = () => {
    if (!id) return;
    cancelOrder.mutate(
      { id, reason: cancelReason || undefined },
      {
        onSuccess: () => {
          setCancelDialogOpen(false);
          setCancelReason('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="outline" onClick={() => navigate('/orders')} className="mt-4">
          Back to Orders
        </Button>
      </div>
    );
  }

  const canConfirm = order.status === 'DRAFT' || order.status === 'PENDING';
  const canComplete = order.status === 'CONFIRMED' && order.paymentStatus === 'PAID';
  const canCancel = order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'REFUNDED';
  const canRecordPayment = order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED';
  const canShip = order.fulfillmentStatus === 'PENDING' || order.fulfillmentStatus === 'PACKED';
  const canDeliver = order.fulfillmentStatus === 'SHIPPED';

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={order.orderNumber}
        description={`Created ${format(new Date(order.createdAt), 'PPp')}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/orders')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/orders/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Order
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canCancel && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Order
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Status Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Order Status:</span>
              <StatusBadge status={order.status} type="order" />
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Fulfillment:</span>
              <StatusBadge status={order.fulfillmentStatus} type="fulfillment" />
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Payment:</span>
              <StatusBadge status={order.paymentStatus} type="payment" />
            </div>
            <div className="flex-1" />
            <div className="flex gap-2">
              {canConfirm && (
                <Button
                  size="sm"
                  onClick={() => confirmOrder.mutate(id!)}
                  disabled={confirmOrder.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Order
                </Button>
              )}
              {canComplete && (
                <Button
                  size="sm"
                  onClick={() => completeOrder.mutate(id!)}
                  disabled={completeOrder.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Order
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
              <CardDescription>{order.items.length} item(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-muted-foreground">{item.productSku}</div>
                          {item.variantName && (
                            <div className="text-sm text-muted-foreground">{item.variantName}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">
                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>Subtotal</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.subtotal)}</TableCell>
                  </TableRow>
                  {order.discountAmount > 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        Discount
                        {order.discountCode && (
                          <span className="ml-2 text-muted-foreground">({order.discountCode})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        -{formatCurrency(order.discountAmount)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={4}>Tax ({order.taxRate}%)</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.taxAmount)}</TableCell>
                  </TableRow>
                  {order.shippingCost > 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>Shipping</TableCell>
                      <TableCell className="text-right">{formatCurrency(order.shippingCost)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-bold">
                    <TableCell colSpan={4}>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payments
                </CardTitle>
                <CardDescription>
                  {formatCurrency(order.paidAmount)} paid of {formatCurrency(order.totalAmount)}
                </CardDescription>
              </div>
              {canRecordPayment && (
                <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                  Record Payment
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {order.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.paidAt), 'PP')}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>{payment.reference || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payments recorded yet
                </div>
              )}
              {order.dueAmount > 0 && (
                <div className="mt-4 flex justify-between border-t pt-4">
                  <span className="font-medium">Amount Due</span>
                  <span className="font-bold text-destructive">
                    {formatCurrency(order.dueAmount)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fulfillment Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Fulfillment
                </CardTitle>
                <CardDescription>
                  {fulfillmentStatusLabels[order.fulfillmentStatus]}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {canShip && (
                  <Button size="sm" onClick={() => setShippingDialogOpen(true)}>
                    Mark Shipped
                  </Button>
                )}
                {canDeliver && (
                  <Button size="sm" onClick={() => markDelivered.mutate(id!)}>
                    Mark Delivered
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Carrier</div>
                  <div className="font-medium">{order.shipping?.carrier || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tracking Number</div>
                  <div className="font-medium">{order.shipping?.trackingNumber || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Shipped At</div>
                  <div className="font-medium">
                    {order.shipping?.shippedAt
                      ? format(new Date(order.shipping.shippedAt), 'PPp')
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Delivered At</div>
                  <div className="font-medium">
                    {order.shipping?.deliveredAt
                      ? format(new Date(order.shipping.deliveredAt), 'PPp')
                      : '-'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {timeline && timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="flex-1 w-px bg-border" />
                      </div>
                      <div className="pb-4">
                        <div className="font-medium">{event.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(event.createdAt), 'PPp')} by {event.createdBy}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium">{order.customerName}</div>
                {order.customerId && (
                  <Link
                    to={`/customers/${order.customerId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View Profile
                  </Link>
                )}
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {order.customerPhone}
                </div>
              )}
              {order.customerEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {order.customerEmail}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="font-medium">{order.recipient.name}</div>
                <div className="text-sm">{order.recipient.phone}</div>
                <div className="text-sm text-muted-foreground">
                  {order.recipient.address}
                  {order.recipient.city && `, ${order.recipient.city}`}
                  {order.recipient.province && `, ${order.recipient.province}`}
                  {order.recipient.postalCode && ` ${order.recipient.postalCode}`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Channel</div>
                <div className="font-medium">{salesChannelLabels[order.channel]}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Order Date</div>
                <div className="font-medium">{format(new Date(order.orderDate), 'PP')}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Branch</div>
                <div className="font-medium">{order.branchName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created By</div>
                <div className="font-medium">{order.createdByName}</div>
              </div>
              {order.externalOrderId && (
                <div>
                  <div className="text-sm text-muted-foreground">External Order ID</div>
                  <div className="font-medium">{order.externalOrderId}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profitability */}
          <Card>
            <CardHeader>
              <CardTitle>Profitability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost</span>
                <span className="font-medium">{formatCurrency(order.totalCost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Gross Profit</span>
                <span className={`font-bold ${order.grossProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(order.grossProfit)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <span>{order.profitMargin.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(order.customerNote || order.internalNote) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.customerNote && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Customer Note</div>
                    <div className="text-sm">{order.customerNote}</div>
                  </div>
                )}
                {order.internalNote && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Internal Note</div>
                    <div className="text-sm">{order.internalNote}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Amount due: {formatCurrency(order.dueAmount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                placeholder={order.dueAmount.toString()}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference (Optional)</label>
              <Input
                placeholder="Transaction ID, receipt number, etc."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordPayment.isPending}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping Dialog */}
      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Shipped</DialogTitle>
            <DialogDescription>
              Enter tracking information for this shipment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tracking Number (Optional)</label>
              <Input
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkShipped} disabled={markShipped.isPending}>
              Mark Shipped
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Input
                placeholder="Enter cancellation reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Order
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelOrder.isPending}>
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
