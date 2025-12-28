import { apiClient } from '@/lib/api-client'
import type { User, Organization, Branch } from '@/stores/auth-store'

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  name: string
  email: string
  password: string
  orgName?: string
}

// Backend returns data at root level (not wrapped in data property)
export interface AuthResponse {
  user: User
  organization: Organization
  branch?: Branch | null
  organizations: Organization[]
  branches: Branch[]
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/api/auth/login', data),

  signup: (data: SignupRequest) =>
    apiClient.post<AuthResponse>('/api/auth/signup', data),

  logout: () => apiClient.post<{ success: boolean }>('/api/auth/logout'),

  me: () => apiClient.get<AuthResponse>('/api/auth/me'),

  switchOrg: (orgId: string) =>
    apiClient.post<AuthResponse>('/api/auth/switch-org', { orgId }),

  switchBranch: (branchId: string) =>
    apiClient.post<AuthResponse>('/api/auth/switch-branch', { branchId }),
}
