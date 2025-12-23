// Stock Level Types
export interface StockLevel {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  variantId?: string;
  variantName?: string;
  variantSku?: string;
  branchId: string;
  branchName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  unit: string;
  lastUpdated: string;
  // Computed
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface StockLevelFilters {
  productId?: string;
  variantId?: string;
  branchId?: string;
  search?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  page?: number;
  limit?: number;
}

// Stock Movement Types
export type MovementType =
  | 'PURCHASE_IN'      // Received from purchase order
  | 'SALE_OUT'         // Sold via order
  | 'ADJUSTMENT_IN'    // Manual adjustment (add)
  | 'ADJUSTMENT_OUT'   // Manual adjustment (remove)
  | 'TRANSFER_IN'      // Transferred from another branch
  | 'TRANSFER_OUT'     // Transferred to another branch
  | 'RETURN_IN'        // Customer return
  | 'RETURN_OUT'       // Supplier return
  | 'DAMAGED'          // Damaged/expired write-off
  | 'INITIAL';         // Initial stock entry

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  variantId?: string;
  variantName?: string;
  variantSku?: string;
  branchId: string;
  branchName: string;
  type: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceType?: 'ORDER' | 'PURCHASE_ORDER' | 'TRANSFER' | 'ADJUSTMENT';
  referenceId?: string;
  referenceNumber?: string;
  lotId?: string;
  lotNumber?: string;
  reason?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface StockMovementFilters {
  productId?: string;
  variantId?: string;
  branchId?: string;
  type?: MovementType;
  referenceType?: string;
  referenceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Lot/Batch Types (for lot tracking)
export interface Lot {
  id: string;
  productId: string;
  variantId?: string;
  branchId: string;
  lotNumber: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  expiryDate?: string;
  manufactureDate?: string;
  receivedDate: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  notes?: string;
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | 'QUARANTINE';
  createdAt: string;
  updatedAt: string;
}

export interface LotFilters {
  productId?: string;
  variantId?: string;
  branchId?: string;
  status?: Lot['status'];
  expiringBefore?: string;
  page?: number;
  limit?: number;
}

// Stock Adjustment Types
export type AdjustmentReason =
  | 'CYCLE_COUNT'
  | 'DAMAGED'
  | 'EXPIRED'
  | 'LOST'
  | 'FOUND'
  | 'CORRECTION'
  | 'INITIAL_STOCK'
  | 'OTHER';

export interface StockAdjustment {
  productId: string;
  variantId?: string;
  branchId: string;
  type: 'ADD' | 'REMOVE' | 'SET';
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
  lotId?: string;
  unitCost?: number;
}

export interface BulkStockAdjustment {
  branchId: string;
  reason: AdjustmentReason;
  notes?: string;
  items: {
    productId: string;
    variantId?: string;
    type: 'ADD' | 'REMOVE' | 'SET';
    quantity: number;
    lotId?: string;
    unitCost?: number;
  }[];
}

// Stock Transfer Types
export interface StockTransfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  status: 'DRAFT' | 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  items: StockTransferItem[];
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  sentAt?: string;
  receivedAt?: string;
  receivedBy?: string;
  receivedByName?: string;
}

export interface StockTransferItem {
  productId: string;
  productName: string;
  productSku: string;
  variantId?: string;
  variantName?: string;
  variantSku?: string;
  quantity: number;
  receivedQuantity?: number;
  lotId?: string;
  lotNumber?: string;
  unit: string;
}

export interface CreateStockTransfer {
  fromBranchId: string;
  toBranchId: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    lotId?: string;
  }[];
  notes?: string;
}

// Stock Summary/Dashboard Types
export interface StockSummary {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  topMovingProducts: {
    productId: string;
    productName: string;
    productSku: string;
    movementCount: number;
    totalQuantity: number;
  }[];
  recentMovements: StockMovement[];
}

// Movement type labels for display
export const movementTypeLabels: Record<MovementType, string> = {
  PURCHASE_IN: 'Purchase Receipt',
  SALE_OUT: 'Sale',
  ADJUSTMENT_IN: 'Adjustment (In)',
  ADJUSTMENT_OUT: 'Adjustment (Out)',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  RETURN_IN: 'Customer Return',
  RETURN_OUT: 'Supplier Return',
  DAMAGED: 'Damaged/Write-off',
  INITIAL: 'Initial Stock',
};

export const adjustmentReasonLabels: Record<AdjustmentReason, string> = {
  CYCLE_COUNT: 'Cycle Count',
  DAMAGED: 'Damaged',
  EXPIRED: 'Expired',
  LOST: 'Lost/Missing',
  FOUND: 'Found',
  CORRECTION: 'Correction',
  INITIAL_STOCK: 'Initial Stock',
  OTHER: 'Other',
};
