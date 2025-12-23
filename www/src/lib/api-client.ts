const API_BASE = '/api';

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>[];
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Callback for handling 401 errors (set by auth provider)
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function clearUnauthorizedHandler() {
  onUnauthorized = null;
}

class ApiClient {
  private orgId: string | null = null;
  private branchId: string | null = null;

  setOrg(orgId: string | null) {
    this.orgId = orgId;
  }

  setBranch(branchId: string | null) {
    this.branchId = branchId;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.orgId) {
      headers['X-Org-Id'] = this.orgId;
    }
    if (this.branchId) {
      headers['X-Branch-Id'] = this.branchId;
    }
    return headers;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${path}`;

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    // Handle empty responses (like 204 No Content)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      // Handle 401 Unauthorized - redirect to login (except for login endpoint itself)
      if (response.status === 401 && !path.includes('/auth/login')) {
        if (onUnauthorized) {
          onUnauthorized();
        }
      }

      const error = new Error(data.error?.message || data.error || 'Request failed') as Error & {
        code?: string;
        details?: unknown;
        status?: number;
      };
      error.code = data.error?.code || 'UNKNOWN_ERROR';
      error.details = data.error?.details;
      error.status = response.status;
      throw error;
    }

    return data;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = path;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request<T>('GET', url);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const url = `${API_BASE}${path}`;

    const headers: HeadersInit = {};
    if (this.orgId) {
      headers['X-Org-Id'] = this.orgId;
    }
    if (this.branchId) {
      headers['X-Branch-Id'] = this.branchId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error?.message || 'Upload failed') as Error & {
        code?: string;
        status?: number;
      };
      error.code = data.error?.code || 'UPLOAD_ERROR';
      error.status = response.status;
      throw error;
    }

    return data;
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse, ApiError, PaginatedResponse };
