import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi, type LoginRequest, type SignupRequest } from './api'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-client'

export function useAuth() {
  const {
    setUser,
    setOrganization,
    setBranch,
    setOrganizations,
    setBranches,
    setLoading,
    logout: clearAuth,
  } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      try {
        const response = await authApi.me()
        const { user, organization, branch, organizations, branches } = response

        setUser(user)
        setOrganization(organization)
        setBranch(branch || null)
        setOrganizations(organizations)
        setBranches(branches)

        // Update API client context
        apiClient.setOrgContext(organization?.id || null, branch?.id || null)

        return response
      } catch {
        clearAuth()
        throw new Error('Not authenticated')
      } finally {
        setLoading(false)
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    setUser,
    setOrganization,
    setBranch,
    setOrganizations,
    setBranches,
  } = useAuthStore()

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      const { user, organization, branch, organizations, branches } = response

      setUser(user)
      setOrganization(organization)
      setBranch(branch || null)
      setOrganizations(organizations)
      setBranches(branches)

      // Update API client context
      apiClient.setOrgContext(organization?.id || null, branch?.id || null)

      // Invalidate auth query
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })

      toast.success('Welcome back!')
      navigate('/dashboard')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed')
    },
  })
}

export function useSignup() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    setUser,
    setOrganization,
    setBranch,
    setOrganizations,
    setBranches,
  } = useAuthStore()

  return useMutation({
    mutationFn: (data: SignupRequest) => authApi.signup(data),
    onSuccess: (response) => {
      // Signup response has slightly different structure (org instead of organization)
      const { user, organization, branch, organizations, branches } = response as {
        user: typeof response.user
        organization: typeof response.organization
        branch?: typeof response.branch
        organizations: typeof response.organizations
        branches: typeof response.branches
      }

      setUser(user)
      setOrganization(organization)
      setBranch(branch || null)
      setOrganizations(organizations || [organization])
      setBranches(branches || [])

      // Update API client context
      apiClient.setOrgContext(organization?.id || null, branch?.id || null)

      // Invalidate auth query
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })

      toast.success('Account created successfully!')
      navigate('/dashboard')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Signup failed')
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { logout: clearAuth } = useAuthStore()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearAuth()
      apiClient.setOrgContext(null, null)
      queryClient.clear()
      navigate('/login')
    },
  })
}
