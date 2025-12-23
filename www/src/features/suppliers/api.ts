import { apiClient } from '@/lib/api-client';
import type { Supplier, SupplierFormValues, SuppliersResponse } from './types';

export const suppliersApi = {
  async list(): Promise<SuppliersResponse> {
    return apiClient.get('/suppliers');
  },

  async get(id: string): Promise<{ data: Supplier }> {
    return apiClient.get(`/suppliers/${id}`);
  },

  async create(data: SupplierFormValues): Promise<{ data: Supplier }> {
    return apiClient.post('/suppliers', data);
  },

  async update(id: string, data: Partial<SupplierFormValues>): Promise<{ data: Supplier }> {
    return apiClient.patch(`/suppliers/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/suppliers/${id}`);
  },
};
