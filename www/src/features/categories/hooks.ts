import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { categoriesApi } from './api';
import type { CategoryFormValues, CategoryFilters, CategoryTree } from './types';
import { toast } from '@/components/ui/toast';

// Fetch categories list
export function useCategories(filters?: CategoryFilters) {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: () => categoriesApi.list(filters),
  });
}

// Fetch categories as tree
export function useCategoryTree() {
  return useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: () => categoriesApi.tree(),
    select: (data) => data.data,
  });
}

// Fetch single category
export function useCategory(id: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoriesApi.get(id),
    enabled: !!id,
    select: (data) => data.data,
  });
}

// Create category mutation
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryFormValues) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
}

// Update category mutation
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryFormValues> }) =>
      categoriesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.detail(variables.id) });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
}

// Delete category mutation
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
}

// Reorder categories mutation
export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orders: { id: string; sortOrder: number }[]) =>
      categoriesApi.reorder(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder categories');
    },
  });
}

// Helper function to flatten category tree
export function flattenCategoryTree(
  tree: CategoryTree[],
  depth = 0
): (CategoryTree & { depth: number })[] {
  const result: (CategoryTree & { depth: number })[] = [];

  for (const category of tree) {
    result.push({ ...category, depth });
    if (category.children && category.children.length > 0) {
      result.push(...flattenCategoryTree(category.children, depth + 1));
    }
  }

  return result;
}

// Helper to build tree from flat list
export function buildCategoryTree(categories: CategoryTree[]): CategoryTree[] {
  const map = new Map<string, CategoryTree>();
  const roots: CategoryTree[] = [];

  // First pass: create map
  for (const category of categories) {
    map.set(category.id, { ...category, children: [], depth: 0 });
  }

  // Second pass: build tree
  for (const category of categories) {
    const node = map.get(category.id)!;
    if (category.parentId && map.has(category.parentId)) {
      const parent = map.get(category.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
