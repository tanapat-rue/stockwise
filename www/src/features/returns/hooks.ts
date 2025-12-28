import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { returnsApi } from './api'
import { queryKeys } from '@/lib/query-client'
import type { ReturnListParams, CreateReturnRequest } from './types'

export function useReturns(params?: ReturnListParams) {
  return useQuery({
    queryKey: queryKeys.returns.list(params as Record<string, unknown>),
    queryFn: () => returnsApi.list(params),
  })
}

export function useReturn(id: string) {
  return useQuery({
    queryKey: queryKeys.returns.detail(id),
    queryFn: () => returnsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateReturnRequest) => returnsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all })
      toast.success('Return request created')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create return')
    },
  })
}

export function useApproveReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => returnsApi.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(id) })
      toast.success('Return approved')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve return')
    },
  })
}

export function useRejectReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      returnsApi.reject(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(id) })
      toast.success('Return rejected')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject return')
    },
  })
}

export function useReceiveReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => returnsApi.receive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Return received')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to receive return')
    },
  })
}

export function useCompleteReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => returnsApi.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(id) })
      toast.success('Return completed')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete return')
    },
  })
}
