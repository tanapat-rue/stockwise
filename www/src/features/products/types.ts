export interface Product {
  id: string
  orgId: string
  sku: string
  name: string
  description?: string
  category?: string
  categoryId?: string
  price: number // in satang
  cost: number // in satang
  image?: string
  imageKey?: string
  weight?: number
  dimensions?: string
  costingMethod?: 'FIFO' | 'MOVING_AVERAGE'
  averageCost?: number
  totalQuantity?: number
  createdAt: string
  updatedAt: string
}

export interface ProductListParams {
  search?: string
  categoryId?: string
  page?: number
  limit?: number
}

export interface ProductListResponse {
  data: Product[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateProductRequest {
  sku: string
  name: string
  description?: string
  category?: string
  price: number
  weight?: number
  dimensions?: string
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}
