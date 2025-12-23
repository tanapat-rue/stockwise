import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  History,
  Calendar,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useStockMovements, movementTypeLabels } from '@/features/inventory';
import type { StockMovement, MovementType } from '@/features/inventory';
import { debounce, formatCurrency } from '@/lib/utils';

// Movement type badge variants
const movementTypeBadgeVariant: Record<MovementType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PURCHASE_IN: 'default',
  SALE_OUT: 'secondary',
  ADJUSTMENT_IN: 'outline',
  ADJUSTMENT_OUT: 'outline',
  TRANSFER_IN: 'default',
  TRANSFER_OUT: 'secondary',
  RETURN_IN: 'default',
  RETURN_OUT: 'destructive',
  DAMAGED: 'destructive',
  INITIAL: 'outline',
};

// Types that increase stock
const incomingTypes: MovementType[] = ['PURCHASE_IN', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'RETURN_IN', 'INITIAL'];

export function StockMovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const type = searchParams.get('type') as MovementType | undefined;
  const page = parseInt(searchParams.get('page') || '0', 10);

  // Date range (simplified for now)
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  // Data
  const { data: movementsData, isLoading } = useStockMovements({
    type,
    startDate,
    endDate,
    page,
    limit: 20,
  });

  // Debounced search - not used in API yet, but prepared for product search
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

  // Table columns
  const columns: ColumnDef<StockMovement>[] = [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(row.original.createdAt), 'HH:mm')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={movementTypeBadgeVariant[row.original.type]}>
          {movementTypeLabels[row.original.type]}
        </Badge>
      ),
    },
    {
      accessorKey: 'productName',
      header: 'Product',
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
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => {
        const isIncoming = incomingTypes.includes(row.original.type);
        return (
          <div className="flex items-center gap-1">
            {isIncoming ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
            <span className={isIncoming ? 'text-green-600' : 'text-red-600'}>
              {isIncoming ? '+' : '-'}{row.original.quantity}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'previousQuantity',
      header: 'Before',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.previousQuantity}</span>
      ),
    },
    {
      accessorKey: 'newQuantity',
      header: 'After',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.newQuantity}</span>
      ),
    },
    {
      accessorKey: 'referenceNumber',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.referenceNumber || '—'}
        </span>
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
      accessorKey: 'createdByName',
      header: 'By',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.createdByName}</span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Stock Movements"
        description="Track all inventory changes and transactions"
        actions={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
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
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Movement Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(movementTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date filter would go here - simplified for now */}
        <Button variant="outline" size="icon">
          <Calendar className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {movementsData?.data && movementsData.data.length > 0 ? (
        <DataTable
          columns={columns}
          data={movementsData.data}
          isLoading={isLoading}
          pageCount={movementsData.meta.totalPages}
          pageIndex={page}
          pageSize={20}
          onPaginationChange={handlePageChange}
        />
      ) : !isLoading ? (
        <EmptyState
          icon={History}
          title="No movements yet"
          description="Stock movements will appear here as inventory changes occur"
        />
      ) : (
        <DataTable columns={columns} data={[]} isLoading={true} pageSize={20} />
      )}
    </div>
  );
}
