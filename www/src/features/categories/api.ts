import { apiClient } from '@/lib/api-client';
import type { Category, CategoryTree, CategoryFormValues, CategoriesResponse, CategoryFilters } from './types';

export const categoriesApi = {
  // Get all categories (flat list)
  async list(filters?: CategoryFilters): Promise<CategoriesResponse> {
    return apiClient.get('/categories', filters as Record<string, string | number | boolean | undefined>);
  },

  // Get categories as tree structure
  async tree(): Promise<{ data: CategoryTree[] }> {
    return apiClient.get('/categories/tree');
  },

  // Get single category
  async get(id: string): Promise<{ data: Category }> {
    return apiClient.get(`/categories/${id}`);
  },

  // Create category
  async create(data: CategoryFormValues): Promise<{ data: Category }> {
    return apiClient.post('/categories', data);
  },

  // Update category
  async update(id: string, data: Partial<CategoryFormValues>): Promise<{ data: Category }> {
    return apiClient.patch(`/categories/${id}`, data);
  },

  // Delete category
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/categories/${id}`);
  },

  // Reorder categories
  async reorder(orders: { id: string; sortOrder: number }[]): Promise<void> {
    return apiClient.post('/categories/reorder', { orders });
  },
};
