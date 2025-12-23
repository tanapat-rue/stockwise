export interface Product {
  id: string;
  orgId: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  categoryId?: string;
  categoryName?: string;
  tags?: string[];
  brand?: string;
  unit?: string; // piece, kg, box, etc.
  image?: string; // URL for display
  imageKey?: string; // MinIO object key
  hasVariants?: boolean;
  attributeDefinitions?: AttributeDefinition[];
  price: number; // in cents
  cost: number; // in cents
  compareAtPrice?: number;
  weight?: number;
  dimensions?: string;
  trackInventory?: boolean;
  lotTracking?: boolean;
  serialTracking?: boolean;
  expiryTracking?: boolean;
  status?: ProductStatus;
  totalStock?: number;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface AttributeDefinition {
  name: string;
  values: string[];
}

export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: 'cm' | 'in';
}

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface ProductVariant {
  id: string;
  orgId: string;
  productId: string;
  sku: string;
  barcode?: string;
  attributes: Record<string, string>; // { Size: "M", Color: "Red" }
  price?: number; // optional override
  cost?: number;
  imageUrl?: string;
  isActive: boolean;
  stock?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormValues {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  brand?: string;
  unit: string;
  price: number;
  cost: number;
  compareAtPrice?: number;
  weight?: number;
  dimensions?: ProductDimensions;
  trackInventory?: boolean;
  lotTracking?: boolean;
  serialTracking?: boolean;
  expiryTracking?: boolean;
  status?: ProductStatus;
  hasVariants?: boolean;
  attributeDefinitions?: AttributeDefinition[];
}

export interface VariantFormValues {
  sku: string;
  barcode?: string;
  attributes: Record<string, string>;
  price?: number;
  cost?: number;
  isActive?: boolean;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  hasVariants?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Unit options for products
export const UNIT_OPTIONS = [
  { value: 'piece', label: 'Piece' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'set', label: 'Set' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'g', label: 'Gram' },
  { value: 'l', label: 'Liter' },
  { value: 'ml', label: 'Milliliter' },
  { value: 'm', label: 'Meter' },
  { value: 'cm', label: 'Centimeter' },
] as const;
