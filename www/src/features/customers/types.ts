export interface Customer {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  points: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormValues {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface CustomersResponse {
  data: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
