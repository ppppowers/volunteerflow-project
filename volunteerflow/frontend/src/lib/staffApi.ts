const BASE = '/api/staff';

export class StaffApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getStaffToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vf_staff_token');
}

function getSupportSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('vf_support_session');
    if (!raw) return null;
    return JSON.parse(raw).sessionId ?? null;
  } catch {
    return null;
  }
}

async function staffFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = getStaffToken();
  const supportSessionId = getSupportSessionId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(supportSessionId ? { 'X-Support-Session-Id': supportSessionId } : {}),
    ...(init.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    // Clear ONLY staff auth state — never touch vf_token or vf_user
    localStorage.removeItem('vf_staff_token');
    localStorage.removeItem('vf_staff_user');
    window.location.href = '/staff/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StaffApiError(data?.error ?? 'Request failed', res.status, data);
  return data;
}

export const staffApi = {
  get:    (path: string)                    => staffFetch(path),
  post:   (path: string, body: unknown)     => staffFetch(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  (path: string, body: unknown)     => staffFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string)                    => staffFetch(path, { method: 'DELETE' }),
};
