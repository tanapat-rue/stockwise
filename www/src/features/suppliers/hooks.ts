import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { suppliersApi } from './api'
import { queryKeys } from '@/lib/query-client'
import type { SupplierListParams, CreateSupplierRequest, UpdateSupplierRequest } from './types'

export function useSuppliers(params?: SupplierListParams) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(params as Record<string, unknown>),
    queryFn: () => suppliersApi.list(params),
  })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => suppliersApi.get(id),
    enabled: !!id,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSupplierRequest) => suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      toast.success('Supplier created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create supplier')
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierRequest }) =>
      suppliersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) })
      toast.success('Supplier updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update supplier')
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      toast.success('Supplier deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete supplier')
    },
  })
}
