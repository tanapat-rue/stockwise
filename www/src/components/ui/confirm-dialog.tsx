import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Trash2,
  Info,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  variant?: ConfirmDialogVariant
  loading?: boolean
  icon?: React.ReactNode
  children?: React.ReactNode
}

const variantConfig: Record<
  ConfirmDialogVariant,
  {
    icon: React.ReactNode
    iconBg: string
    iconColor: string
    buttonVariant: 'destructive' | 'default' | 'secondary' | 'outline'
  }
> = {
  danger: {
    icon: <Trash2 className="h-6 w-6" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonVariant: 'destructive',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6" />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonVariant: 'default',
  },
  info: {
    icon: <Info className="h-6 w-6" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonVariant: 'default',
  },
  success: {
    icon: <CheckCircle2 className="h-6 w-6" />,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    buttonVariant: 'default',
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
  icon,
  children,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const config = variantConfig[variant]

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error('Confirm action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const effectiveLoading = loading || isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <DialogHeader className="flex flex-col items-center text-center sm:items-center">
                {/* Animated Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className={cn(
                    'mb-4 flex h-16 w-16 items-center justify-center rounded-full',
                    config.iconBg,
                    config.iconColor
                  )}
                >
                  {icon || config.icon}
                </motion.div>

                <DialogTitle className="text-xl">{title}</DialogTitle>
                {description && (
                  <DialogDescription className="mt-2 text-center">
                    {description}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Optional custom content */}
              {children && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="py-4"
                >
                  {children}
                </motion.div>
              )}

              <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={effectiveLoading}
                    className="w-full sm:w-auto"
                  >
                    {cancelText}
                  </Button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant={config.buttonVariant}
                    onClick={handleConfirm}
                    disabled={effectiveLoading}
                    className="w-full sm:w-auto"
                  >
                    {effectiveLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {confirmText}
                  </Button>
                </motion.div>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

// Convenience components for common use cases
interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName?: string
  itemType?: string
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemType = 'item',
  onConfirm,
  loading,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="danger"
      title={`Delete ${itemType}?`}
      description={
        itemName
          ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
          : `Are you sure you want to delete this ${itemType}? This action cannot be undone.`
      }
      confirmText="Delete"
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}

// Hook for managing confirm dialog state
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<{
    title: string
    description?: string
    onConfirm: () => void | Promise<void>
    variant?: ConfirmDialogVariant
  } | null>(null)

  const confirm = React.useCallback(
    (newConfig: {
      title: string
      description?: string
      onConfirm: () => void | Promise<void>
      variant?: ConfirmDialogVariant
    }) => {
      setConfig(newConfig)
      setIsOpen(true)
    },
    []
  )

  const close = React.useCallback(() => {
    setIsOpen(false)
    setConfig(null)
  }, [])

  const ConfirmDialogComponent = React.useCallback(
    () =>
      config ? (
        <ConfirmDialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) close()
          }}
          title={config.title}
          description={config.description}
          onConfirm={config.onConfirm}
          variant={config.variant}
        />
      ) : null,
    [isOpen, config, close]
  )

  return { confirm, close, ConfirmDialog: ConfirmDialogComponent }
}
