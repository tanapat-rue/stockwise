// Document Types
export type DocumentType = 'INVOICE' | 'RECEIPT' | 'TAX_INVOICE' | 'QUOTATION' | 'SHIPPING_LABEL' | 'PACKING_LIST';
export type DocumentStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'VOIDED';

export interface Document {
  id: string;
  orgId: string;
  type: DocumentType;
  documentNumber: string;

  // Source
  sourceType: 'ORDER' | 'PURCHASE_ORDER' | 'MANUAL';
  sourceId?: string;
  sourceNumber?: string;

  // Parties
  seller: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    taxId?: string;
    branchNumber?: string;
  };
  buyer: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    taxId?: string;
    branchNumber?: string;
  };

  // Items
  items: DocumentItem[];

  // Totals
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;

  // Status
  status: DocumentStatus;

  // File
  fileUrl?: string;

  // Dates
  issueDate: string;
  dueDate?: string;
  emailSentAt?: string;

  // Notes
  notes?: string;

  // Metadata
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

// Filters
export interface DocumentFilters {
  type?: DocumentType;
  status?: DocumentStatus;
  sourceType?: string;
  sourceId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Labels
export const documentTypeLabels: Record<DocumentType, string> = {
  INVOICE: 'Invoice',
  RECEIPT: 'Receipt',
  TAX_INVOICE: 'Tax Invoice',
  QUOTATION: 'Quotation',
  SHIPPING_LABEL: 'Shipping Label',
  PACKING_LIST: 'Packing List',
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  SENT: 'Sent',
  PAID: 'Paid',
  VOIDED: 'Voided',
};

export const documentStatusColors: Record<DocumentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  ISSUED: 'secondary',
  SENT: 'default',
  PAID: 'default',
  VOIDED: 'destructive',
};
