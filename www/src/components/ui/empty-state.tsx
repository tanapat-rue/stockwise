import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Package,
  FileText,
  Users,
  ShoppingCart,
  Truck,
  Search,
  Inbox,
  Box,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export type EmptyStatePreset =
  | 'products'
  | 'orders'
  | 'purchase-orders'
  | 'customers'
  | 'suppliers'
  | 'inventory'
  | 'documents'
  | 'search'
  | 'general'

interface EmptyStateProps {
  preset?: EmptyStatePreset
  icon?: LucideIcon
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
  children?: React.ReactNode
}

const presetConfig: Record<
  EmptyStatePreset,
  {
    icon: LucideIcon
    title: string
    description: string
    iconColor: string
    iconBg: string
  }
> = {
  products: {
    icon: Package,
    title: 'No products yet',
    description: 'Get started by adding your first product to the catalog.',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  orders: {
    icon: ShoppingCart,
    title: 'No orders found',
    description: 'When customers place orders, they will appear here.',
    iconColor: 'text-green-500',
    iconBg: 'bg-green-50 dark:bg-green-950/30',
  },
  'purchase-orders': {
    icon: Truck,
    title: 'No purchase orders',
    description: 'Create purchase orders to replenish your inventory.',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  customers: {
    icon: Users,
    title: 'No customers yet',
    description: 'Your customer list is empty. Add your first customer.',
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  suppliers: {
    icon: Truck,
    title: 'No suppliers found',
    description: 'Add suppliers to manage your product sourcing.',
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/30',
  },
  inventory: {
    icon: Box,
    title: 'No inventory data',
    description: 'Add products and stock to see inventory information.',
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-50 dark:bg-teal-950/30',
  },
  documents: {
    icon: FileText,
    title: 'No documents',
    description: 'Documents and invoices will appear here.',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filter to find what you\'re looking for.',
    iconColor: 'text-slate-500',
    iconBg: 'bg-slate-50 dark:bg-slate-800/30',
  },
  general: {
    icon: Inbox,
    title: 'Nothing here yet',
    description: 'This section is empty. Content will appear when available.',
    iconColor: 'text-gray-500',
    iconBg: 'bg-gray-50 dark:bg-gray-800/30',
  },
}

export function EmptyState({
  preset = 'general',
  icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  const config = presetConfig[preset]
  const IconComponent = icon || config.icon
  const ActionIcon = action?.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        className
      )}
    >
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className={cn(
          'relative mb-6 flex h-20 w-20 items-center justify-center rounded-full',
          config.iconBg
        )}
      >
        {/* Decorative ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className={cn(
            'absolute inset-0 rounded-full border-2 opacity-30',
            config.iconColor.replace('text-', 'border-')
          )}
        />
        <IconComponent className={cn('h-10 w-10', config.iconColor)} strokeWidth={1.5} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {title || config.title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground text-center max-w-sm mb-6"
      >
        {description || config.description}
      </motion.p>

      {/* Action Button */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={action.onClick}>
            {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        </motion.div>
      )}

      {/* Custom children */}
      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  )
}

// Convenience components for common presets
export function ProductsEmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      preset="products"
      action={
        onAdd
          ? { label: 'Add Product', onClick: onAdd, icon: Package }
          : undefined
      }
    />
  )
}

export function OrdersEmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      preset="orders"
      action={
        onAdd
          ? { label: 'Create Order', onClick: onAdd, icon: ShoppingCart }
          : undefined
      }
    />
  )
}

export function SearchEmptyState({ query }: { query?: string }) {
  return (
    <EmptyState
      preset="search"
      title={query ? `No results for "${query}"` : 'No results found'}
      description="Try adjusting your search criteria or check the spelling."
    />
  )
}
