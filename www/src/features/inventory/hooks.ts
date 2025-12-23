import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { inventoryApi } from './api';
import type {
  StockLevelFilters,
  StockMovementFilters,
  LotFilters,
  StockAdjustment,
  BulkStockAdjustment,
  CreateStockTransfer,
} from './types';
import { toast } from '@/components/ui/toast';

// Stock Levels Hooks
export function useStockLevels(filters?: StockLevelFilters) {
  return useQuery({
    queryKey: queryKeys.inventory.stockLevels(filters),
    queryFn: () => inventoryApi.getStockLevels(filters),
  });
}

export function useStockLevel(productId: string, branchId: string, variantId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.stockLevel(productId, branchId, variantId),
    queryFn: () => inventoryApi.getStockLevel(productId, branchId, variantId),
    enabled: !!productId && !!branchId,
    select: (data) => data.data,
  });
}

export function useProductStock(productId: string) {
  return useQuery({
    queryKey: queryKeys.inventory.productStock(productId),
    queryFn: () => inventoryApi.getProductStock(productId),
    enabled: !!productId,
    select: (data) => data.data,
  });
}

export function useLowStockProducts(branchId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.lowStock(branchId),
    queryFn: () => inventoryApi.getLowStockProducts(branchId),
    select: (data) => data.data,
  });
}

export function useOutOfStockProducts(branchId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.outOfStock(branchId),
    queryFn: () => inventoryApi.getOutOfStockProducts(branchId),
    select: (data) => data.data,
  });
}

// Stock Movements Hooks
export function useStockMovements(filters?: StockMovementFilters) {
  return useQuery({
    queryKey: queryKeys.inventory.movements(filters),
    queryFn: () => inventoryApi.getMovements(filters),
  });
}

export function useStockMovement(id: string) {
  return useQuery({
    queryKey: queryKeys.inventory.movement(id),
    queryFn: () => inventoryApi.getMovement(id),
    enabled: !!id,
    select: (data) => data.data,
  });
}

export function useProductMovements(productId: string, filters?: Omit<StockMovementFilters, 'productId'>) {
  return useQuery({
    queryKey: queryKeys.inventory.productMovements(productId, filters),
    queryFn: () => inventoryApi.getProductMovements(productId, filters),
    enabled: !!productId,
  });
}

// Stock Adjustment Mutations
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adjustment: StockAdjustment) => inventoryApi.adjustStock(adjustment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Stock adjusted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust stock');
    },
  });
}

export function useBulkAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adjustment: BulkStockAdjustment) => inventoryApi.bulkAdjustStock(adjustment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success(`${variables.items.length} items adjusted successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to adjust stock');
    },
  });
}

// Lot Hooks
export function useLots(filters?: LotFilters) {
  return useQuery({
    queryKey: queryKeys.inventory.lots(filters),
    queryFn: () => inventoryApi.getLots(filters),
  });
}

export function useLot(id: string) {
  return useQuery({
    queryKey: queryKeys.inventory.lot(id),
    queryFn: () => inventoryApi.getLot(id),
    enabled: !!id,
    select: (data) => data.data,
  });
}

export function useProductLots(productId: string, branchId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.productLots(productId, branchId),
    queryFn: () => inventoryApi.getProductLots(productId, branchId),
    enabled: !!productId,
    select: (data) => data.data,
  });
}

export function useCreateLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inventoryApi.createLot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Lot created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create lot');
    },
  });
}

export function useUpdateLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Parameters<typeof inventoryApi.createLot>[0]> }) =>
      inventoryApi.updateLot(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lot(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lots() });
      toast.success('Lot updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update lot');
    },
  });
}

// Stock Transfer Hooks
export function useStockTransfers(filters?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.inventory.transfers(filters),
    queryFn: () => inventoryApi.getTransfers(filters),
  });
}

export function useStockTransfer(id: string) {
  return useQuery({
    queryKey: queryKeys.inventory.transfer(id),
    queryFn: () => inventoryApi.getTransfer(id),
    enabled: !!id,
    select: (data) => data.data,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStockTransfer) => inventoryApi.createTransfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      toast.success('Transfer created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transfer');
    },
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStockTransfer> }) =>
      inventoryApi.updateTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfer(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      toast.success('Transfer updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update transfer');
    },
  });
}

export function useSendTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryApi.sendTransfer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfer(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Transfer sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send transfer');
    },
  });
}

export function useReceiveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: { productId: string; variantId?: string; receivedQuantity: number }[] }) =>
      inventoryApi.receiveTransfer(id, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfer(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Transfer received successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to receive transfer');
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      inventoryApi.cancelTransfer(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfer(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.transfers() });
      toast.success('Transfer cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel transfer');
    },
  });
}

// Summary Hook
export function useInventorySummary(branchId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.summary(branchId),
    queryFn: () => inventoryApi.getSummary(branchId),
    select: (data) => data.data,
  });
}

// Reorder Point Mutation
export function useSetReorderPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      branchId,
      reorderPoint,
      variantId,
    }: {
      productId: string;
      branchId: string;
      reorderPoint: number;
      variantId?: string;
    }) => inventoryApi.setReorderPoint(productId, branchId, reorderPoint, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      toast.success('Reorder point updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update reorder point');
    },
  });
}
