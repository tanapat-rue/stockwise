import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'default';

interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status], className)}
    >
      {children}
    </Badge>
  );
}

// Common status mappings for order/document statuses
export const orderStatusMap: Record<string, { status: StatusType; label: string }> = {
  DRAFT: { status: 'default', label: 'Draft' },
  PENDING: { status: 'pending', label: 'Pending' },
  CONFIRMED: { status: 'info', label: 'Confirmed' },
  COMPLETED: { status: 'success', label: 'Completed' },
  CANCELLED: { status: 'error', label: 'Cancelled' },
  REFUNDED: { status: 'warning', label: 'Refunded' },
};

export const paymentStatusMap: Record<string, { status: StatusType; label: string }> = {
  UNPAID: { status: 'error', label: 'Unpaid' },
  PARTIAL: { status: 'warning', label: 'Partial' },
  PAID: { status: 'success', label: 'Paid' },
  REFUNDED: { status: 'info', label: 'Refunded' },
};

export const fulfillmentStatusMap: Record<string, { status: StatusType; label: string }> = {
  PENDING: { status: 'pending', label: 'Pending' },
  PICKING: { status: 'info', label: 'Picking' },
  PICKED: { status: 'info', label: 'Picked' },
  PACKING: { status: 'info', label: 'Packing' },
  PACKED: { status: 'info', label: 'Packed' },
  SHIPPED: { status: 'warning', label: 'Shipped' },
  DELIVERED: { status: 'success', label: 'Delivered' },
  RETURNED: { status: 'error', label: 'Returned' },
};

export const productStatusMap: Record<string, { status: StatusType; label: string }> = {
  ACTIVE: { status: 'success', label: 'Active' },
  DRAFT: { status: 'default', label: 'Draft' },
  ARCHIVED: { status: 'error', label: 'Archived' },
};
