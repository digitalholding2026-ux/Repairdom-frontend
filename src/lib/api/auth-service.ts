import { siteConfig } from '@/lib/site-config';

export interface SignUpInput {
  firstName: string;
  lastName?: string;
  phone?: string;
  whatsapp?: string;
  email: string;
  password: string;
  role?: 'CLIENT' | 'TECHNICIAN';
  city?: string;
  address?: string;
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
  whatsapp?: string;
  role?: string;
  emailVerified?: boolean;
  avatarUrl?: string | null;
  city?: string | null;
  address?: string | null;
  createdAt?: string;
}

export interface AuthSession {
  user: AuthUser;
  mode: 'real';
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status);
  }

  return body as T;
}

export async function signUp(input: SignUpInput): Promise<AuthSession> {
  const payload: Record<string, unknown> = {
    firstName: input.firstName,
    lastName: input.lastName || undefined,
    phone: input.phone || undefined,
    whatsapp: input.whatsapp || undefined,
    email: input.email,
    password: input.password,
  };

  if (input.role === 'TECHNICIAN') {
    payload.role = 'TECHNICIAN';
    payload.city = input.city || undefined;
    payload.categories = input.categories ?? [];
  }

  // CLIENT : envoi des champs de profil (ville, adresse) requis pour le
  // parcours d'inscription renforcé (sprint UX CLIENT).
  if (input.role !== 'TECHNICIAN') {
    payload.city = input.city || undefined;
    payload.address = input.address || undefined;
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

export function homePathForRole(role: string | undefined): string {
  if (role === 'TECHNICIAN') return '/technicien';
  if (role === 'ADMIN') return '/admin/kyc';
  return '/client';
}

export async function logout(): Promise<void> {
  await apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' });
}

export async function verifyEmail(token: string): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

export async function resendVerification(email: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function updateMe(input: {
  firstName?: string;
  lastName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  address?: string | null;
}): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function uploadClientAvatar(file: File): Promise<AuthUser> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<AuthUser>('/auth/me/avatar', { method: 'POST', body: form });
}