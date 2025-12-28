import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { customersApi } from './api'
import { queryKeys } from '@/lib/query-client'
import type { CustomerListParams, CreateCustomerRequest, UpdateCustomerRequest } from './types'

export function useCustomers(params?: CustomerListParams) {
  return useQuery({
    queryKey: queryKeys.customers.list(params as Record<string, unknown>),
    queryFn: () => customersApi.list(params),
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success('Customer created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create customer')
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerRequest }) =>
      customersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) })
      toast.success('Customer updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update customer')
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success('Customer deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete customer')
    },
  })
}
