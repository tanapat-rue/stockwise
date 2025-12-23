import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Download,
  Send,
  Trash2,
  Printer,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useDocuments,
  useDeleteDocument,
  useVoidDocument,
  documentTypeLabels,
  documentStatusLabels,
  documentStatusColors,
} from '@/features/documents';
import type { Document, DocumentType, DocumentStatus } from '@/features/documents';
import { formatCurrency, debounce } from '@/lib/utils';

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const type = searchParams.get('type') as DocumentType | undefined;
  const status = searchParams.get('status') as DocumentStatus | undefined;
  const page = parseInt(searchParams.get('page') || '0', 10);

  // Data
  const { data: documentsData, isLoading } = useDocuments({
    search: search || undefined,
    type,
    status,
    page,
    limit: 20,
  });
  const deleteDocument = useDeleteDocument();
  const voidDocument = useVoidDocument();

  // Delete/Void dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set('search', value);
        } else {
          params.delete('search');
        }
        params.set('page', '0');
        setSearchParams(params);
      }, 300),
    [searchParams, setSearchParams]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debouncedSearch(value);
  };

  const handleFilterChange = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '0');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const handleDelete = (doc: Document) => {
    setSelectedDoc(doc);
    setDeleteDialogOpen(true);
  };

  const handleVoid = (doc: Document) => {
    setSelectedDoc(doc);
    setVoidDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedDoc) {
      deleteDocument.mutate(selectedDoc.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedDoc(null);
        },
      });
    }
  };

  const confirmVoid = () => {
    if (selectedDoc) {
      voidDocument.mutate(
        { id: selectedDoc.id },
        {
          onSuccess: () => {
            setVoidDialogOpen(false);
            setSelectedDoc(null);
          },
        }
      );
    }
  };

  // Table columns
  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Document',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.documentNumber}</div>
          <div className="text-sm text-muted-foreground">
            {documentTypeLabels[row.original.type]}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'issueDate',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.issueDate), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'buyer',
      header: 'Recipient',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.buyer.name}</div>
        </div>
      ),
    },
    {
      accessorKey: 'sourceNumber',
      header: 'Source',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.sourceNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.totalAmount)}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={documentStatusColors[row.original.status]}>
          {documentStatusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </DropdownMenuItem>
            {row.original.status !== 'VOIDED' && (
              <DropdownMenuItem>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {row.original.status !== 'VOIDED' && (
              <DropdownMenuItem
                onClick={() => handleVoid(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Void
              </DropdownMenuItem>
            )}
            {row.original.status === 'DRAFT' && (
              <DropdownMenuItem
                onClick={() => handleDelete(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Documents"
        description="Invoices, receipts, and other documents"
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={type || 'all'}
          onValueChange={(value) =>
            handleFilterChange('type', value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.keys(documentTypeLabels) as DocumentType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {documentTypeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status || 'all'}
          onValueChange={(value) =>
            handleFilterChange('status', value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(documentStatusLabels) as DocumentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {documentStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {documentsData?.data && documentsData.data.length > 0 ? (
        <DataTable
          columns={columns}
          data={documentsData.data}
          isLoading={isLoading}
          pageCount={documentsData.meta.totalPages}
          pageIndex={page}
          pageSize={20}
          onPaginationChange={handlePageChange}
        />
      ) : !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Documents will appear here when you generate invoices, receipts, or other documents from orders"
        />
      ) : (
        <DataTable columns={columns} data={[]} isLoading={true} pageSize={20} />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDoc?.documentNumber}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void Confirmation Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void "{selectedDoc?.documentNumber}"? This will mark
              the document as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmVoid}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
