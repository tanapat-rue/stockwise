import { apiClient } from '@/lib/api-client';
import type { User, Organization, Branch, LoginRequest, LoginResponse } from './types';

export const authApi = {
  // Get current authenticated user
  async me(): Promise<{ user: User; organization: Organization; organizations: Organization[]; branches: Branch[] }> {
    return apiClient.get('/auth/me');
  },

  // Login with email and password
  async login(data: LoginRequest): Promise<LoginResponse> {
    return apiClient.post('/auth/login', data);
  },

  // Logout
  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },

  // Switch organization
  async switchOrg(orgId: string): Promise<{ organization: Organization; branches: Branch[] }> {
    return apiClient.post('/auth/switch-org', { orgId });
  },

  // Switch branch
  async switchBranch(branchId: string): Promise<{ branch: Branch }> {
    return apiClient.post('/auth/switch-branch', { branchId });
  },
};
