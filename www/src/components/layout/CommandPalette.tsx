import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Warehouse,
  ShoppingCart,
  Truck,
  Users,
  FileText,
  BarChart3,
  Settings,
  Plus,
  Search,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/ui-store';

const navigationCommands = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'main'] },
  { name: 'Products', href: '/products', icon: Package, keywords: ['items', 'goods'] },
  { name: 'Categories', href: '/categories', icon: FolderTree, keywords: ['groups', 'types'] },
  { name: 'Stock', href: '/stock', icon: Warehouse, keywords: ['inventory', 'levels'] },
  { name: 'Orders', href: '/orders', icon: ShoppingCart, keywords: ['sales', 'transactions'] },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: Truck, keywords: ['buy', 'supplier'] },
  { name: 'Contacts', href: '/contacts', icon: Users, keywords: ['customers', 'suppliers'] },
  { name: 'Documents', href: '/documents', icon: FileText, keywords: ['invoices', 'receipts'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, keywords: ['analytics', 'stats'] },
  { name: 'Settings', href: '/settings', icon: Settings, keywords: ['config', 'preferences'] },
];

const quickActions = [
  { name: 'New Product', href: '/products/new', icon: Plus, keywords: ['create', 'add'] },
  { name: 'New Order', href: '/orders/new', icon: Plus, keywords: ['create', 'sale'] },
  { name: 'New Purchase Order', href: '/purchase-orders/new', icon: Plus, keywords: ['create', 'buy'] },
  { name: 'New Contact', href: '/contacts/new', icon: Plus, keywords: ['create', 'customer', 'supplier'] },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, closeCommandPalette } = useUIStore();

  const runCommand = (href: string) => {
    closeCommandPalette();
    navigate(href);
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={closeCommandPalette}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.href}
              value={`${action.name} ${action.keywords.join(' ')}`}
              onSelect={() => runCommand(action.href)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {navigationCommands.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.name} ${item.keywords.join(' ')}`}
              onSelect={() => runCommand(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
