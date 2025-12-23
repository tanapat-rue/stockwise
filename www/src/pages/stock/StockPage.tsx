import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Search,
  Package,
  AlertTriangle,
  XCircle,
  ArrowUpDown,
  Filter,
  Download,
  Plus,
  Minus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStockLevels, useLowStockProducts, useOutOfStockProducts } from '@/features/inventory';
import type { StockLevel } from '@/features/inventory';
import { debounce } from '@/lib/utils';
import { StockAdjustmentDialog } from './StockAdjustmentDialog';

export function StockPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const tab = searchParams.get('tab') || 'all';
  const page = parseInt(searchParams.get('page') || '0', 10);

  // Adjustment dialog state
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REMOVE'>('ADD');

  // Data - switch based on tab
  const { data: allStockData, isLoading: allLoading } = useStockLevels({
    search: search || undefined,
    page,
    limit: 20,
  });

  const { data: lowStockData, isLoading: lowLoading } = useLowStockProducts();
  const { data: outOfStockData, isLoading: outLoading } = useOutOfStockProducts();

  // Get current data based on tab
  const currentData = useMemo(() => {
    switch (tab) {
      case 'low':
        return { data: lowStockData || [], isLoading: lowLoading };
      case 'out':
        return { data: outOfStockData || [], isLoading: outLoading };
      default:
        return {
          data: allStockData?.data || [],
          isLoading: allLoading,
          meta: allStockData?.meta,
        };
    }
  }, [tab, allStockData, lowStockData, outOfStockData, allLoading, lowLoading, outLoading]);

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

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    params.set('page', '0');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const handleAdjust = (stock: StockLevel, type: 'ADD' | 'REMOVE') => {
    setSelectedStock(stock);
    setAdjustmentType(type);
    setAdjustmentDialogOpen(true);
  };

  // Stats cards data
  const stats = useMemo(() => ({
    lowStockCount: lowStockData?.length || 0,
    outOfStockCount: outOfStockData?.length || 0,
  }), [lowStockData, outOfStockData]);

  // Table columns
  const columns: ColumnDef<StockLevel>[] = [
    {
      accessorKey: 'productName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.productName}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.productSku}
            {row.original.variantName && (
              <span className="ml-2 text-xs">({row.original.variantName})</span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'branchName',
      header: 'Branch',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.branchName}</span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Quantity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <span className={row.original.isOutOfStock ? 'text-destructive font-medium' : ''}>
            {row.original.quantity}
          </span>
          <span className="text-muted-foreground ml-1">{row.original.unit}</span>
        </div>
      ),
    },
    {
      accessorKey: 'reservedQuantity',
      header: 'Reserved',
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground">
          {row.original.reservedQuantity > 0 ? row.original.reservedQuantity : '—'}
        </div>
      ),
    },
    {
      accessorKey: 'availableQuantity',
      header: 'Available',
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {row.original.availableQuantity}
          <span className="text-muted-foreground ml-1">{row.original.unit}</span>
        </div>
      ),
    },
    {
      accessorKey: 'reorderPoint',
      header: 'Reorder At',
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground">
          {row.original.reorderPoint > 0 ? row.original.reorderPoint : '—'}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        if (row.original.isOutOfStock) {
          return (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Out of Stock
            </Badge>
          );
        }
        if (row.original.isLowStock) {
          return (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Low Stock
            </Badge>
          );
        }
        return (
          <Badge variant="secondary">In Stock</Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAdjust(row.original, 'ADD')}
            title="Add stock"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAdjust(row.original, 'REMOVE')}
            title="Remove stock"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Stock Levels"
        description="Monitor and adjust inventory across all branches"
        actions={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Below reorder point
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All Stock</TabsTrigger>
            <TabsTrigger value="low" className="gap-2">
              Low Stock
              {stats.lowStockCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {stats.lowStockCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="out" className="gap-2">
              Out of Stock
              {stats.outOfStockCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats.outOfStockCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          {currentData.data.length > 0 ? (
            <DataTable
              columns={columns}
              data={currentData.data}
              isLoading={currentData.isLoading}
              pageCount={currentData.meta?.totalPages || 1}
              pageIndex={page}
              pageSize={20}
              onPaginationChange={handlePageChange}
            />
          ) : !currentData.isLoading ? (
            <EmptyState
              icon={Package}
              title="No stock data"
              description="Stock levels will appear here once products are added to inventory"
            />
          ) : (
            <DataTable columns={columns} data={[]} isLoading={true} pageSize={20} />
          )}
        </TabsContent>

        <TabsContent value="low" className="mt-4">
          {currentData.data.length > 0 ? (
            <DataTable
              columns={columns}
              data={currentData.data}
              isLoading={currentData.isLoading}
              pageSize={20}
            />
          ) : !currentData.isLoading ? (
            <EmptyState
              icon={AlertTriangle}
              title="No low stock items"
              description="All products are above their reorder points"
            />
          ) : (
            <DataTable columns={columns} data={[]} isLoading={true} pageSize={20} />
          )}
        </TabsContent>

        <TabsContent value="out" className="mt-4">
          {currentData.data.length > 0 ? (
            <DataTable
              columns={columns}
              data={currentData.data}
              isLoading={currentData.isLoading}
              pageSize={20}
            />
          ) : !currentData.isLoading ? (
            <EmptyState
              icon={XCircle}
              title="No out of stock items"
              description="All products have available inventory"
            />
          ) : (
            <DataTable columns={columns} data={[]} isLoading={true} pageSize={20} />
          )}
        </TabsContent>
      </Tabs>

      {/* Adjustment Dialog */}
      <StockAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        stockLevel={selectedStock}
        initialType={adjustmentType}
      />
    </div>
  );
}
