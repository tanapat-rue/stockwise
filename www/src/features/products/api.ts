import { apiClient } from '@/lib/api-client';
import type {
  Product,
  ProductVariant,
  ProductFormValues,
  VariantFormValues,
  ProductsResponse,
  ProductFilters,
} from './types';

export const productsApi = {
  // List products with filters
  async list(filters?: ProductFilters): Promise<ProductsResponse> {
    return apiClient.get('/products', filters as Record<string, string | number | boolean | undefined>);
  },

  // Get single product with variants
  async get(id: string): Promise<{ data: Product }> {
    return apiClient.get(`/products/${id}`);
  },

  // Create product
  async create(data: ProductFormValues): Promise<{ data: Product }> {
    return apiClient.post('/products', data);
  },

  // Update product
  async update(id: string, data: Partial<ProductFormValues>): Promise<{ data: Product }> {
    return apiClient.patch(`/products/${id}`, data);
  },

  // Delete product
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/products/${id}`);
  },

  // Bulk update status
  async bulkUpdateStatus(ids: string[], status: Product['status']): Promise<void> {
    return apiClient.post('/products/bulk-status', { ids, status });
  },

  // Variants
  async getVariants(productId: string): Promise<{ data: ProductVariant[] }> {
    return apiClient.get(`/products/${productId}/variants`);
  },

  async createVariant(productId: string, data: VariantFormValues): Promise<{ data: ProductVariant }> {
    return apiClient.post(`/products/${productId}/variants`, data);
  },

  async updateVariant(
    productId: string,
    variantId: string,
    data: Partial<VariantFormValues>
  ): Promise<{ data: ProductVariant }> {
    return apiClient.patch(`/products/${productId}/variants/${variantId}`, data);
  },

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    return apiClient.delete(`/products/${productId}/variants/${variantId}`);
  },

  // Generate variants from attribute definitions
  async generateVariants(
    productId: string,
    attributeDefinitions: { name: string; values: string[] }[]
  ): Promise<{ data: ProductVariant[] }> {
    return apiClient.post(`/products/${productId}/variants/generate`, { attributeDefinitions });
  },

  // Generate next SKU
  async getNextSku(prefix?: string): Promise<{ sku: string }> {
    return apiClient.get('/products/next-sku', { prefix });
  },

  // Upload product image
  async uploadImage(productId: string, file: File): Promise<{ data: Product; key: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`/api/products/${productId}/image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Failed to upload image');
    }
    return response.json();
  },
};
