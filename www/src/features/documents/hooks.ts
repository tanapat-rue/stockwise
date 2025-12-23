import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { documentsApi } from './api';
import type { DocumentFilters, DocumentType, DocumentStatus } from './types';
import { toast } from '@/components/ui/toast';

export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: queryKeys.documents.list(filters),
    queryFn: () => documentsApi.list(filters),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: queryKeys.documents.detail(id),
    queryFn: () => documentsApi.get(id),
    enabled: !!id,
    select: (data) => data.data,
  });
}

export function useGenerateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      sourceType,
      sourceId,
    }: {
      type: DocumentType;
      sourceType: 'ORDER' | 'PURCHASE_ORDER';
      sourceId: string;
    }) => documentsApi.generate(type, sourceType, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      toast.success('Document generated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate document');
    },
  });
}

export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DocumentStatus }) =>
      documentsApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(variables.id) });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

export function useVoidDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      documentsApi.void(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      toast.success('Document voided');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to void document');
    },
  });
}

export function useSendDocument() {
  return useMutation({
    mutationFn: ({
      id,
      email,
      subject,
      message,
    }: {
      id: string;
      email: string;
      subject?: string;
      message?: string;
    }) => documentsApi.sendEmail(id, email, subject, message),
    onSuccess: () => {
      toast.success('Document sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send document');
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      toast.success('Document deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });
}
