import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { ordersApi } from './api';
import type {
  OrderFilters,
  OrderFormValues,
  QuickAddOrder,
  OrderStatus,
  FulfillmentStatus,
} from './types';
import { toast } from '@/components/ui/toast';

// List orders
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => ordersApi.list(filters),
  });
}

// Get single order
export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
    select: (data) => data.data,
  });
}

// Get order timeline
export function useOrderTimeline(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.timeline(id),
    queryFn: () => ordersApi.getTimeline(id),
    enabled: !!id,
    select: (data) => data.data.events,
  });
}

// Get next order number
export function useNextOrderNumber() {
  return useQuery({
    queryKey: ['orders', 'next-number'],
    queryFn: () => ordersApi.getNextNumber(),
    select: (data) => data.data.orderNumber,
  });
}

// Create order
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrderFormValues) => ordersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Order created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order');
    },
  });
}

// Quick add order (POS)
export function useQuickAddOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: QuickAddOrder) => ordersApi.quickAdd(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Order completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order');
    },
  });
}

// Update order
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OrderFormValues> }) =>
      ordersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      toast.success('Order updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update order');
    },
  });
}

// Delete order
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Order deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete order');
    },
  });
}

// Update status
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: OrderStatus; notes?: string }) =>
      ordersApi.updateStatus(id, status, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

// Update fulfillment status
export function useUpdateFulfillmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: FulfillmentStatus; notes?: string }) =>
      ordersApi.updateFulfillmentStatus(id, status, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      toast.success('Fulfillment status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update fulfillment status');
    },
  });
}

// Confirm order
export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Order confirmed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to confirm order');
    },
  });
}

// Complete order
export function useCompleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      toast.success('Order completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete order');
    },
  });
}

// Cancel order
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      ordersApi.cancel(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Order cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel order');
    },
  });
}

// Record payment
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      method,
      amount,
      reference,
    }: {
      id: string;
      method: string;
      amount: number;
      reference?: string;
    }) => ordersApi.recordPayment(id, method, amount, reference),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      toast.success('Payment recorded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });
}

// Mark shipped
export function useMarkShipped() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, trackingNumber }: { id: string; trackingNumber?: string }) =>
      ordersApi.markShipped(id, trackingNumber),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.id) });
      toast.success('Order marked as shipped');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update shipping status');
    },
  });
}

// Mark delivered
export function useMarkDelivered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.markDelivered(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      toast.success('Order marked as delivered');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update delivery status');
    },
  });
}

// Duplicate order
export function useDuplicateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success('Order duplicated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to duplicate order');
    },
  });
}

// Bulk status update
export function useBulkUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: OrderStatus }) =>
      ordersApi.bulkUpdateStatus(ids, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success(`${variables.ids.length} orders updated`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update orders');
    },
  });
}

// Order stats
export function useOrderStats(filters?: { startDate?: string; endDate?: string; branchId?: string }) {
  return useQuery({
    queryKey: ['orders', 'stats', filters],
    queryFn: () => ordersApi.getStats(filters),
    select: (data) => data.data,
  });
}
