export interface Customer {
  id: string
  orgId: string
  code?: string
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  notes?: string
  totalOrders: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

export interface CustomerListParams {
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CustomerListResponse {
  data: Customer[]
  total: number
  page: number
  limit: number
}

export interface CreateCustomerRequest {
  code?: string
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  notes?: string
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {}
