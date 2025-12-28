import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './card'

interface StatCardProps {
  title: string
  value: string | number
  description?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, description, icon, className }: StatCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && (
            <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
          )}
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
