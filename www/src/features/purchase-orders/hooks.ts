import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { purchaseOrdersApi } from './api';
import type {
  PurchaseOrderFilters,
  PurchaseOrderFormValues,
  ReceiveItemsPayload,
  POStatus,
} from './types';
import { toast } from '@/components/ui/toast';

// List POs
export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(filters),
    queryFn: () => purchaseOrdersApi.list(filters),
  });
}

// Get single PO
export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: () => purchaseOrdersApi.get(id),
    enabled: !!id,
    select: (data) => data.data,
  });
}

// Get next order number
export function useNextPONumber() {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.nextReference(),
    queryFn: () => purchaseOrdersApi.getNextNumber(),
    select: (data) => data.data.orderNumber,
  });
}

// Create PO
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PurchaseOrderFormValues) => purchaseOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success('Purchase order created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create purchase order');
    },
  });
}

// Update PO
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PurchaseOrderFormValues> }) =>
      purchaseOrdersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(variables.id) });
      toast.success('Purchase order updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update purchase order');
    },
  });
}

// Delete PO
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success('Purchase order deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete purchase order');
    },
  });
}

// Update status
export function useUpdatePOStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: POStatus; notes?: string }) =>
      purchaseOrdersApi.updateStatus(id, status, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(variables.id) });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

// Submit draft
export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(id) });
      toast.success('Purchase order submitted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit purchase order');
    },
  });
}

// Receive items
export function useReceiveItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReceiveItemsPayload }) =>
      purchaseOrdersApi.receiveItems(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Items received successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to receive items');
    },
  });
}

// Cancel PO
export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      purchaseOrdersApi.cancel(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(variables.id) });
      toast.success('Purchase order cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel purchase order');
    },
  });
}

// Record payment
export function useRecordPOPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      amount,
      method,
      reference,
    }: {
      id: string;
      amount: number;
      method: string;
      reference?: string;
    }) => purchaseOrdersApi.recordPayment(id, amount, method, reference),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(variables.id) });
      toast.success('Payment recorded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });
}

// Duplicate PO
export function useDuplicatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success('Purchase order duplicated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to duplicate purchase order');
    },
  });
}

// Stats
export function usePOStats(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['purchase-orders', 'stats', filters],
    queryFn: () => purchaseOrdersApi.getStats(filters),
    select: (data) => data.data,
  });
}
