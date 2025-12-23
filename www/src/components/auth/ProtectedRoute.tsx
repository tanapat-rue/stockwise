import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/ui-store';
import { useAuth } from '@/features/auth';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRoles?: string[];
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRoles,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuthStore();
  const { isLoading: isAuthLoading, isError } = useAuth();

  // Show loading state while checking authentication
  if (isLoading || isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || isError) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check required roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) =>
      hasRole(role as any)
    );
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
