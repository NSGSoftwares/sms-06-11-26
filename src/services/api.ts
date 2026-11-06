// File: sms-frontend/src/services/api.ts

const normalizeBase = (raw: string): string => {
  const v = raw.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(v)) return v;                       // already full
  if (v.startsWith('/')) return `${window.location.origin}${v}`; // "/api"
  return `http://${v}`;                                         // "127.0.0.1:8000/api"
};

export const getApiBaseUrl = (): string => {
  const envUrl =
    typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : undefined;
  return normalizeBase(String(envUrl ?? '').trim() || 'http://127.0.0.1:8000/api');
};

export const getAttachmentUrl = (recordId: string, attachmentId: string): string => {
  if (!recordId || !attachmentId) return '';
  const base = getApiBaseUrl().replace(/\/+$/, '');
  const token = localStorage.getItem('auth_token');
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${base}/records/${recordId}/attachments/${attachmentId}${tokenQuery}`;
};

export const resolveAttachmentUrl = (src?: string | null): string => {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  const base = getApiBaseUrl().replace(/\/+$/, '');
  const token = localStorage.getItem('auth_token');
  const tokenParam = token ? `token=${encodeURIComponent(token)}` : '';

  let fullUrl = src;
  if (!src.startsWith('http://') && !src.startsWith('https://')) {
    if (src.startsWith('/api/')) {
      fullUrl = `${base.replace(/\/api$/, '')}${src}`;
    } else if (src.startsWith('/records/')) {
      fullUrl = `${base}${src}`;
    } else if (src.startsWith('/')) {
      fullUrl = `${base}${src}`;
    } else {
      fullUrl = `${base}/${src}`;
    }
  }

  if (tokenParam && !fullUrl.includes('token=')) {
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + tokenParam;
  }
  return fullUrl;
};

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    const url = baseUrl || getApiBaseUrl();
    this.baseUrl = String(url).replace(/\/+$/, '');
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private getHeaders(isFormData = false): HeadersInit {
    const headers: HeadersInit = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const text = await response.text();
    let data: any = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Server non-JSON response:', text);
        throw new Error(`Server Error (${response.status}). Check backend server logs.`);
      }
    }

    if (!response.ok) {
      if (response.status === 401 && localStorage.getItem('auth_token')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
      let errorMessage = data?.message || `Request failed with status ${response.status}`;
      if (response.status >= 500 && /^internal server error$/i.test(String(errorMessage).trim())) {
        errorMessage = `The server could not save this change (HTTP ${response.status}). Confirm that the selected MySQL database was initialized with the current sms-db/schema.sql, then check the PHP backend error log for the SQL error.`;
      } else if (data?.errors && typeof data.errors === 'object') {
        const details = Object.values(data.errors).flat().filter(Boolean).join(' ');
        if (details) errorMessage = `${errorMessage}: ${details}`;
      }
      throw new Error(errorMessage);
    }

    return data || { success: true, message: '', data: null as any };
  }

  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${cleanEndpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${cleanEndpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(`Could not reach the backend at ${this.baseUrl}. Start the PHP API server and confirm VITE_API_URL in sms-frontend/.env points to it.`);
    }

    return this.handleResponse<T>(response);
  }

  async postFormData<T = any>(endpoint: string, body: FormData): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${cleanEndpoint}`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body,
      });
    } catch {
        throw new Error(`Could not upload the file because the backend at ${this.baseUrl} could not be reached. Check that the PHP API is running and try again.`);
    }

    return this.handleResponse<T>(response);
  }

  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${cleanEndpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(`Could not reach the backend at ${this.baseUrl}. Start the PHP API server and confirm VITE_API_URL in sms-frontend/.env points to it.`);
    }

    return this.handleResponse<T>(response);
  }

  async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${this.baseUrl}${cleanEndpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${this.baseUrl}${cleanEndpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }
}

export const api = new ApiClient();
export type { ApiResponse };
