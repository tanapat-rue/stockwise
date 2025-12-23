export interface Supplier {
  id: string;
  orgId: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFormValues {
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
}

export interface SuppliersResponse {
  data: Supplier[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
