import { apiClient, ApiResponse, PaginatedResponse } from '@/lib/api-client';
import type { Document, DocumentFilters, DocumentType, DocumentStatus } from './types';

export const documentsApi = {
  // CRUD
  list: (filters?: DocumentFilters) =>
    apiClient.get<PaginatedResponse<Document>>('/documents', { params: filters }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Document>>(`/documents/${id}`),

  // Generate from source
  generate: (type: DocumentType, sourceType: 'ORDER' | 'PURCHASE_ORDER', sourceId: string) =>
    apiClient.post<ApiResponse<Document>>('/documents/generate', { type, sourceType, sourceId }),

  // Update status
  updateStatus: (id: string, status: DocumentStatus) =>
    apiClient.patch<ApiResponse<Document>>(`/documents/${id}/status`, { status }),

  // Void document
  void: (id: string, reason?: string) =>
    apiClient.post<ApiResponse<Document>>(`/documents/${id}/void`, { reason }),

  // Send via email
  sendEmail: (id: string, email: string, subject?: string, message?: string) =>
    apiClient.post<ApiResponse<void>>(`/documents/${id}/send`, { email, subject, message }),

  // Download PDF
  download: (id: string) =>
    apiClient.get<Blob>(`/documents/${id}/download`, { responseType: 'blob' }),

  // Print
  getPrintUrl: (id: string) =>
    apiClient.get<ApiResponse<{ url: string }>>(`/documents/${id}/print`),

  // Delete (only draft)
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/documents/${id}`),
};
