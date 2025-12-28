import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { purchaseOrdersApi } from './api'
import { queryKeys } from '@/lib/query-client'
import type { POListParams, CreatePORequest, UpdatePORequest, ReceivePORequest, RecordPOPaymentRequest } from './types'

export function usePurchaseOrders(params?: POListParams) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(params as Record<string, unknown>),
    queryFn: () => purchaseOrdersApi.list(params),
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: () => purchaseOrdersApi.get(id),
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: CreatePORequest) => purchaseOrdersApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      toast.success('Purchase order created successfully')
      navigate(`/purchase-orders/${response.data.id}/edit`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create purchase order')
    },
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePORequest }) =>
      purchaseOrdersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(id) })
      toast.success('Purchase order updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update purchase order')
    },
  })
}

export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(id) })
      toast.success('Purchase order submitted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit purchase order')
    },
  })
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReceivePORequest }) =>
      purchaseOrdersApi.receive(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Items received successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to receive items')
    },
  })
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      purchaseOrdersApi.cancel(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(id) })
      toast.success('Purchase order cancelled')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel purchase order')
    },
  })
}

export function useDuplicatePurchaseOrder() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.duplicate(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      toast.success('Purchase order duplicated')
      navigate(`/purchase-orders/${response.data.id}/edit`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to duplicate purchase order')
    },
  })
}

export function useRecordPOPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecordPOPaymentRequest }) =>
      purchaseOrdersApi.recordPayment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(id) })
      toast.success('Payment recorded')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record payment')
    },
  })
}
