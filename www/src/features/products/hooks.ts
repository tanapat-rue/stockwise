import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { productsApi } from './api';
import type { ProductFormValues, VariantFormValues, ProductFilters, ProductStatus } from './types';
import { toast } from '@/components/ui/toast';

// Fetch products list
export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => productsApi.list(filters),
  });
}

// Fetch single product
export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsApi.get(id),
    enabled: !!id,
    select: (data) => data.data,
  });
}

// Fetch product variants
export function useProductVariants(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.variants(productId),
    queryFn: () => productsApi.getVariants(productId),
    enabled: !!productId,
    select: (data) => data.data,
  });
}

// Create product mutation
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductFormValues) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create product');
    },
  });
}

// Update product mutation
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductFormValues> }) =>
      productsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) });
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update product');
    },
  });
}

// Delete product mutation
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Product deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });
}

// Bulk update status
export function useBulkUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ProductStatus }) =>
      productsApi.bulkUpdateStatus(ids, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success(`${variables.ids.length} products updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update products');
    },
  });
}

// Variant mutations
export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: VariantFormValues }) =>
      productsApi.createVariant(productId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.variants(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      toast.success('Variant created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create variant');
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      variantId,
      data,
    }: {
      productId: string;
      variantId: string;
      data: Partial<VariantFormValues>;
    }) => productsApi.updateVariant(productId, variantId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.variants(variables.productId),
      });
      toast.success('Variant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update variant');
    },
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId: string }) =>
      productsApi.deleteVariant(productId, variantId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.variants(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      toast.success('Variant deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete variant');
    },
  });
}

export function useGenerateVariants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      attributeDefinitions,
    }: {
      productId: string;
      attributeDefinitions: { name: string; values: string[] }[];
    }) => productsApi.generateVariants(productId, attributeDefinitions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.variants(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      toast.success('Variants generated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate variants');
    },
  });
}

// Upload product image
export function useUploadProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) =>
      productsApi.uploadImage(productId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
      toast.success('Image uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload image');
    },
  });
}
