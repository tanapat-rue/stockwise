import { apiClient } from '@/lib/api-client';
import type { Customer, CustomerFormValues, CustomersResponse } from './types';

export const customersApi = {
  async list(): Promise<CustomersResponse> {
    return apiClient.get('/customers');
  },

  async get(id: string): Promise<{ data: Customer }> {
    return apiClient.get(`/customers/${id}`);
  },

  async create(data: CustomerFormValues): Promise<{ data: Customer }> {
    return apiClient.post('/customers', data);
  },

  async update(id: string, data: Partial<CustomerFormValues>): Promise<{ data: Customer }> {
    return apiClient.patch(`/customers/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/customers/${id}`);
  },

  async search(query: string): Promise<{ data: Customer[] }> {
    return apiClient.get('/customers', { search: query });
  },
};
