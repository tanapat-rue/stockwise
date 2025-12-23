import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  ShoppingCart,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Copy,
  XCircle,
  Package,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  usePurchaseOrders,
  useDeletePurchaseOrder,
  useDuplicatePurchaseOrder,
  usePOStats,
  poStatusLabels,
  poStatusColors,
  paymentStatusLabels,
  paymentStatusColors,
} from '@/features/purchase-orders';
import type { PurchaseOrder, POStatus } from '@/features/purchase-orders';
import { formatCurrency, debounce } from '@/lib/utils';

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const status = searchParams.get('status') as POStatus | undefined;
  const page = parseInt(searchParams.get('page') || '0', 10);

  // Data
  const { data: posData, isLoading } = usePurchaseOrders({
    search: search || undefined,
    status,
    page,
    limit: 20,
  });
  const { data: stats } = usePOStats();
  const deletePO = useDeletePurchaseOrder();
  const duplicatePO = useDuplicatePurchaseOrder();

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poToDelete, setPOToDelete] = useState<PurchaseOrder | null>(null);

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

  const handleDelete = (po: PurchaseOrder) => {
    setPOToDelete(po);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (poToDelete) {
      deletePO.mutate(poToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setPOToDelete(null);
        },
      });
    }
  };

  const handleDuplicate = (po: PurchaseOrder) => {
    duplicatePO.mutate(po.id, {
      onSuccess: (data) => {
        navigate(`/purchase-orders/${data.data.data.id}/edit`);
      },
    });
  };

  // Table columns
  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'orderNumber',
      header: 'Order #',
      cell: ({ row }) => (
        <div>
          <Link
            to={`/purchase-orders/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.orderNumber}
          </Link>
          {row.original.referenceNumber && (
            <div className="text-sm text-muted-foreground">
              Ref: {row.original.referenceNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'orderDate',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.orderDate), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'supplierName',
      header: 'Supplier',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.supplierName}</div>
          {row.original.supplierCode && (
            <div className="text-sm text-muted-foreground">
              {row.original.supplierCode}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={poStatusColors[row.original.status]}>
          {poStatusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Payment',
      cell: ({ row }) => (
        <Badge variant={paymentStatusColors[row.original.paymentStatus]}>
          {paymentStatusLabels[row.original.paymentStatus]}
        </Badge>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.totalAmount)}
        </div>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.items.length} items
        </span>
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
            <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            {row.original.status === 'DRAFT' && (
              <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${row.original.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            {row.original.status !== 'CANCELLED' && row.original.status !== 'RECEIVED' && (
              <>
                <DropdownMenuSeparator />
                {row.original.status !== 'DRAFT' && (
                  <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${row.original.id}/receive`)}>
                    <Package className="mr-2 h-4 w-4" />
                    Receive Items
                  </DropdownMenuItem>
                )}
              </>
            )}
            {row.original.status === 'DRAFT' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage orders from suppliers"
        actions={
          <Button onClick={() => navigate('/purchase-orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">awaiting receipt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalValue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats?.unpaidValue || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={status || 'all'}
          onValueChange={(value) =>
            handleFilterChange('status', value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(poStatusLabels) as POStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {poStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {posData?.data && posData.data.length > 0 ? (
        <DataTable
          columns={columns}
          data={posData.data}
          isLoading={isLoading}
          pageCount={posData.meta.totalPages}
          pageIndex={page}
          pageSize={20}
          onPaginationChange={handlePageChange}
        />
      ) : !isLoading ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchase orders yet"
          description="Create your first purchase order to start tracking supplier orders"
          action={
            <Button onClick={() => navigate('/purchase-orders/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} data={[]} isLoading={true} pageSize={20} />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order "{poToDelete?.orderNumber}"? This action
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
    </div>
  );
}
