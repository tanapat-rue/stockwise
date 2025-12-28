import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ordersApi } from './api'
import { queryKeys } from '@/lib/query-client'
import type { OrderListParams, CreateOrderRequest, UpdateOrderRequest, ShipOrderRequest, CancelOrderRequest } from './types'

export function useOrders(params?: OrderListParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params as Record<string, unknown>),
    queryFn: () => ordersApi.list(params),
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: CreateOrderRequest) => ordersApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      toast.success('Order created successfully')
      navigate(`/orders/${response.data.id}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order')
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderRequest }) =>
      ordersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) })
      toast.success('Order updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update order')
    },
  })
}

export function useConfirmOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ordersApi.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) })
      toast.success('Order confirmed')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to confirm order')
    },
  })
}

export function useShipOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShipOrderRequest }) =>
      ordersApi.ship(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) })
      toast.success('Order shipped')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to ship order')
    },
  })
}

export function useDeliverOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ordersApi.deliver(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) })
      toast.success('Order delivered')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark order as delivered')
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: CancelOrderRequest }) =>
      ordersApi.cancel(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) })
      toast.success('Order cancelled')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel order')
    },
  })
}
