import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventoryApi } from './api'
import { queryKeys } from '@/lib/query-client'
import type { StockListParams, AdjustStockRequest } from './types'

export function useStock(params?: StockListParams) {
  return useQuery({
    queryKey: queryKeys.inventory.list(params as Record<string, unknown>),
    queryFn: () => inventoryApi.list(params),
  })
}

export function useStockLevel(productId: string, branchId: string) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(productId, branchId),
    queryFn: () => inventoryApi.get(productId, branchId),
    enabled: !!productId && !!branchId,
  })
}

export function useInventoryLots(productId: string, branchId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.lots(productId, branchId),
    queryFn: () => inventoryApi.getLots(productId, branchId),
    enabled: !!productId,
  })
}

export function useLowStock(branchId?: string) {
  return useQuery({
    queryKey: ['inventory', 'low-stock', branchId],
    queryFn: () => inventoryApi.getLowStock(branchId),
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AdjustStockRequest) => inventoryApi.adjust(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Stock adjusted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust stock')
    },
  })
}

export function useUpdateReorderPoint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      branchId,
      reorderPoint,
      reorderQuantity,
    }: {
      productId: string
      branchId: string
      reorderPoint: number
      reorderQuantity: number
    }) => inventoryApi.updateReorderPoint(productId, branchId, reorderPoint, reorderQuantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Reorder point updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update reorder point')
    },
  })
}
