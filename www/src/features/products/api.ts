import { apiClient } from '@/lib/api-client'
import type {
  Product,
  ProductListParams,
  ProductListResponse,
  CreateProductRequest,
  UpdateProductRequest,
} from './types'

export const productsApi = {
  list: (params?: ProductListParams) =>
    apiClient.get<ProductListResponse>('/api/products', params as Record<string, unknown>),

  get: (id: string) => apiClient.get<{ data: Product }>(`/api/products/${id}`),

  create: (data: CreateProductRequest) =>
    apiClient.post<{ data: Product }>('/api/products', data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.patch<{ data: Product }>(`/api/products/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/products/${id}`),
}
