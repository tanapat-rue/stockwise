export interface Category {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  parentId?: string;
  path: string; // Materialized path for hierarchical queries (e.g., "/parent-id/this-id")
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
  depth: number;
}

export interface CategoryFormValues {
  name: string;
  slug?: string;
  parentId?: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryFilters {
  search?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface CategoriesResponse {
  data: Category[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
