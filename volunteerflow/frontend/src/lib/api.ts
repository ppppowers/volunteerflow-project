/**
 * Centralized API client for the VolunteerFlow backend.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const data = await api.get('/volunteers');
 *   const created = await api.post('/volunteers', { firstName: 'Jane', ... });
 */

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const token = typeof window !== 'undefined' ? localStorage.getItem('vf_token') : null;

  const init: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const response = await fetch(url, init);

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP ${response.status}: ${response.statusText}`);
    }
    // Non-JSON success response (rare)
    return {} as T;
  }

  if (!response.ok) {
    // 401: token invalid/expired — clear stored auth and redirect to login
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('vf_token');
      localStorage.removeItem('vf_user');
      window.location.href = '/auth';
    }
    const message =
      (json as { error?: string })?.error ?? `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(response.status, message, json);
  }

  // Unwrap { success: true, data: ... } envelope if present
  const envelope = json as { success?: boolean; data?: T };
  if (envelope?.success !== undefined && 'data' in envelope) {
    return envelope.data as T;
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body, ...options }),

  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PUT', body, ...options }),

  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body, ...options }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...options }),

  /** Upload a file as multipart/form-data. Do NOT set Content-Type — the browser sets it with the boundary. */
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vf_token') : null;
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    let json: unknown;
    try { json = await response.json(); } catch {
      if (!response.ok) throw new ApiError(response.status, `HTTP ${response.status}: ${response.statusText}`);
      return {} as T;
    }

    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('vf_token');
        localStorage.removeItem('vf_user');
        window.location.href = '/auth';
      }
      const message = (json as { error?: string })?.error ?? `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(response.status, message, json);
    }

    const envelope = json as { success?: boolean; data?: T };
    if (envelope?.success !== undefined && 'data' in envelope) return envelope.data as T;
    return json as T;
  },
};

/** Build a query string from an object, omitting undefined/null values. */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      q.set(key, String(value));
    }
  }
  const str = q.toString();
  return str ? `?${str}` : '';
}
