export interface Supplier {
  id: string
  orgId: string
  code?: string
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  contactPerson?: string
  paymentTerms?: string
  notes?: string
  totalOrders: number
  totalPurchased: number
  createdAt: string
  updatedAt: string
}

export interface SupplierListParams {
  search?: string
  page?: number
  limit?: number
}

export interface SupplierListResponse {
  data: Supplier[]
  total: number
  page: number
  limit: number
}

export interface CreateSupplierRequest {
  code?: string
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  contactPerson?: string
  paymentTerms?: string
  notes?: string
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}
