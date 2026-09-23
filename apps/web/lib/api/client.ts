export type ApiError = Error & { status?: number; code?: string; challengeToken?: string };

const technicalErrorPattern = /(Prisma|PrismaClient|Invalid `|invocation|Query Engine|\bP20\d{2}\b|column .* does not exist|relation .* does not exist| at .*:\d+:\d+|ECONNREFUSED|ENOTFOUND|fetch failed|stack trace)/i;
const safeCodeMessages: Record<string, string> = {
  SERVER_ERROR: 'Something went wrong. Please try again.',
  DATABASE_ERROR: 'Civique is temporarily unavailable. Please try again shortly.',
  ROUTING_FAILED: 'The report was saved, but department routing is temporarily unavailable.',
  REPORT_SUBMISSION_FAILED: 'We could not submit the report. Please try again.',
  WEBHOOK_RETRY: 'The integration is temporarily unavailable. Please retry shortly.',
};

/** Converts server/provider details into a compact user-safe message. Technical details remain server-side. */
export function toUserMessage(message: unknown, code?: string, status?: number): string {
  const value = typeof message === 'string' ? message.trim() : '';
  if (code && safeCodeMessages[code]) return safeCodeMessages[code];
  if (!value || technicalErrorPattern.test(value) || value.length > 240) {
    if (status === 401) return 'Your session has expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested record could not be found.';
    if (status === 409) return 'This action conflicts with the latest record. Refresh and try again.';
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    return 'Something went wrong. Please try again.';
  }
  return value;
}

const configuredBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
export const API_BASE = configuredBase.endsWith('/api/v1') ? configuredBase : `${configuredBase}/api/v1`;
let refreshInFlight: Promise<boolean> | null = null;
let memoryToken: string | null = null;

export function setClientToken(token: string | null) {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('civique_token', token);
    } else {
      localStorage.removeItem('civique_token');
    }
  }
}

export function getClientToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('civique_token');
  }
  return null;
}

function csrfToken() {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split('; ').find((value) => value.startsWith('civique_csrf='))?.split('=')[1];
}

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getClientToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const data = await response.json().catch(() => ({}));
        if (data?.data?.accessToken) {
          setClientToken(data.data.accessToken);
        }
        return true;
      })
      .catch(() => false)
      .finally(() => { 
        refreshInFlight = null; 
      });
  }
  return refreshInFlight;
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = csrfToken();
    if (csrf) headers.set('x-csrf-token', decodeURIComponent(csrf));
  }

  const token = getClientToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await request(path, init);
  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/refresh' && path !== '/auth/logout') {
    const refreshed = await refreshSession();
    if (refreshed) response = await request(path, init);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(toUserMessage(payload?.error?.message, payload?.error?.code, response.status)) as ApiError;
    error.status = response.status;
    error.code = payload?.error?.code;
    error.challengeToken = payload?.error?.challengeToken;
    throw error;
  }

  // Synchronize token state on login/logout/refresh
  if ((path === '/auth/login' || path === '/auth/mfa/verify') && payload?.data?.accessToken) {
    setClientToken(payload.data.accessToken);
  }
  if (path.startsWith('/auth/logout')) {
    setClientToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('civique_user');
    }
  }

  return (payload?.data ?? payload) as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: formData,
  });
}

export async function logout(allSessions = false) {
  setClientToken(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('civique_user');
  }
  return apiFetch(`/auth/${allSessions ? 'logout-all' : 'logout'}`, { 
    method: 'POST', 
    body: JSON.stringify({}) 
  });
}
