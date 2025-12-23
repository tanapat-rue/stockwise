import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '@/lib/query-client';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/ui-store';
import { authApi } from './api';
import type { LoginRequest } from './types';
import { toast } from '@/components/ui/toast';

// Hook to fetch and sync auth state
export function useAuth() {
  const { setUser, setOrganization, setBranch, setOrganizations, setBranches, setIsLoading, logout } =
    useAuthStore();

  const query = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const data = await authApi.me();
      // Sync state to Zustand store
      setUser(data.user);
      setOrganization(data.organization);
      setOrganizations(data.organizations);
      setBranches(data.branches);

      // Set API client context
      apiClient.setOrg(data.organization.id);
      if (data.branches.length > 0) {
        const mainBranch = data.branches.find(b => b.isMain) || data.branches[0];
        setBranch(mainBranch);
        apiClient.setBranch(mainBranch.id);
      }

      return data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Set isLoading to false when query settles (success or error)
  useEffect(() => {
    if (!query.isLoading && !query.isFetching) {
      setIsLoading(false);
    }
  }, [query.isLoading, query.isFetching, setIsLoading]);

  return query;
}

// Hook for login mutation
export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser, setOrganization, setBranch, setOrganizations, setBranches } = useAuthStore();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      // Update store
      setUser(data.user);
      setOrganization(data.organization);
      setOrganizations(data.organizations);
      setBranches(data.branches);

      // Set API client context
      apiClient.setOrg(data.organization.id);
      if (data.branches.length > 0) {
        const mainBranch = data.branches.find(b => b.isMain) || data.branches[0];
        setBranch(mainBranch);
        apiClient.setBranch(mainBranch.id);
      }

      // Invalidate auth query to refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });

      toast.success('Welcome back!');
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed');
    },
  });
}

// Hook for logout mutation
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Clear store
      logout();
      apiClient.setOrg(null);
      apiClient.setBranch(null);

      // Clear all queries
      queryClient.clear();

      toast.success('Logged out successfully');
      navigate('/login');
    },
  });
}

// Hook for switching organization
export function useSwitchOrg() {
  const queryClient = useQueryClient();
  const { setOrganization, setBranch, setBranches } = useAuthStore();

  return useMutation({
    mutationFn: (orgId: string) => authApi.switchOrg(orgId),
    onSuccess: (data) => {
      setOrganization(data.organization);
      setBranches(data.branches);

      // Set API client context
      apiClient.setOrg(data.organization.id);
      if (data.branches.length > 0) {
        const mainBranch = data.branches.find(b => b.isMain) || data.branches[0];
        setBranch(mainBranch);
        apiClient.setBranch(mainBranch.id);
      }

      // Invalidate all queries to refresh data for new org
      queryClient.invalidateQueries();

      toast.success(`Switched to ${data.organization.name}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to switch organization');
    },
  });
}

// Hook for switching branch
export function useSwitchBranch() {
  const queryClient = useQueryClient();
  const { setBranch } = useAuthStore();

  return useMutation({
    mutationFn: (branchId: string) => authApi.switchBranch(branchId),
    onSuccess: (data) => {
      setBranch(data.branch);
      apiClient.setBranch(data.branch.id);

      // Invalidate queries that depend on branch
      queryClient.invalidateQueries({ queryKey: queryKeys.stock.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      toast.success(`Switched to ${data.branch.name}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to switch branch');
    },
  });
}

// Hook for checking permissions
export function usePermissions() {
  const { hasPermission, hasRole, user } = useAuthStore();

  return {
    hasPermission,
    hasRole,
    user,
    isAdmin: user?.role === 'PLATFORM_ADMIN' || user?.role === 'ORG_ADMIN',
    isManager: user?.role === 'BRANCH_MANAGER',
    isStaff: user?.role === 'STAFF',
  };
}
