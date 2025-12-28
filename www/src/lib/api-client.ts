export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>[]
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class ApiClient {
  private baseUrl = ''
  private orgId: string | null = null
  private branchId: string | null = null
  private onUnauthorized: (() => void) | null = null

  setOrgContext(orgId: string | null, branchId: string | null) {
    this.orgId = orgId
    this.branchId = branchId
  }

  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.orgId) {
      headers['X-Org-Id'] = this.orgId
    }
    if (this.branchId) {
      headers['X-Branch-Id'] = this.branchId
    }
    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      this.onUnauthorized?.()
      const error = new Error('Unauthorized') as Error & { status: number }
      error.status = 401
      throw error
    }

    const data = await response.json()

    if (!response.ok) {
      // Handle both { error: "message" } and { error: { message: "message" } } formats
      let errorMessage = 'Request failed'
      if (typeof data.error === 'string') {
        errorMessage = data.error
      } else if (data.error?.message) {
        errorMessage = data.error.message
      } else if (data.message) {
        errorMessage = data.message
      }

      const error = new Error(errorMessage) as Error & {
        code?: string
        details?: Record<string, string>[]
        status: number
      }
      error.code = data.error?.code
      error.details = data.error?.details
      error.status = response.status
      throw error
    }

    return data
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    })

    return this.handleResponse<T>(response)
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {}
    if (this.orgId) {
      headers['X-Org-Id'] = this.orgId
    }
    if (this.branchId) {
      headers['X-Branch-Id'] = this.branchId
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    })

    return this.handleResponse<T>(response)
  }
}

export const apiClient = new ApiClient()
