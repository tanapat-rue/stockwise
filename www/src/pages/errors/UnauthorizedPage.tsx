import { Link } from 'react-router-dom'
import { ShieldAlert, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      <div className="text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-4xl font-bold">403</h1>
        <p className="mt-2 text-lg text-muted-foreground">Access Denied</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
