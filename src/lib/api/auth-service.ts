import { siteConfig } from '@/lib/site-config';

export interface SignUpInput {
  firstName: string;
  lastName?: string;
  phone?: string;
  email: string;
  password: string;
  role?: 'CLIENT' | 'TECHNICIAN';
  city?: string;
  categories?: string[];
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
}

export interface AuthSession {
  user: AuthUser;
  mode: 'real';
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (body as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status);
  }

  return body as T;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const payload: Record<string, unknown> = {
    firstName: input.firstName,
    phone: input.phone || undefined,
    email: input.email,
    password: input.password,
  };

  if (input.role === 'TECHNICIAN') {
    payload.role = 'TECHNICIAN';
    payload.lastName = input.lastName || undefined;
    payload.city = input.city || undefined;
    payload.categories = input.categories ?? [];
  }

  const data = await apiFetch<{ user: AuthUser; mode: 'real' }>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { user: data.user, mode: 'real' };
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  const data = await apiFetch<{ user: AuthUser; mode: 'real' }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });

  return { user: data.user, mode: 'real' };
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me');
}

export async function logout(): Promise<void> {
  await apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' });
}
