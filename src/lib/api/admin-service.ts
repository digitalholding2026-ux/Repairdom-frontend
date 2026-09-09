import { siteConfig } from '@/lib/site-config';

export interface AdminKycFolder {
  technicianId: string;
  firstName: string;
  lastName: string | null;
  city: string;
  categories: string[];
  kycStatus: string;
  submittedAt: string | null;
  documentCount: number;
}

export interface AdminKycFolderList {
  items: AdminKycFolder[];
}

export interface AdminKycDocument {
  id: string;
  type: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface AdminKycReview {
  reviewerId: string;
  reviewerName: string;
  previousStatus: string;
  newStatus: string;
  reason: string | null;
  createdAt: string;
}

export interface AdminKycDetail {
  technician: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    city: string;
    categories: string[];
    specialties: string[];
    experience: string | null;
    serviceDescription: string | null;
    bio: string | null;
    isAvailable: boolean;
    kycStatus: string;
    kycRejectionReason: string | null;
    completedInterventions: number;
    registeredAt: string;
  };
  documents: AdminKycDocument[];
  reviews: AdminKycReview[];
}

export interface AdminKycDocumentUrl {
  url: string;
  expiresIn: number;
  mimeType: string;
  originalName: string;
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
    const message = (body as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status);
  }

  return body as T;
}

export async function getAdminKycFolders(status: string): Promise<AdminKycFolderList> {
  return apiFetch<AdminKycFolderList>(`/admin/kyc?status=${encodeURIComponent(status)}`);
}

export async function getAdminKycFolder(technicianId: string): Promise<AdminKycDetail> {
  return apiFetch<AdminKycDetail>(`/admin/kyc/${encodeURIComponent(technicianId)}`);
}

export async function getAdminKycDocumentUrl(
  technicianId: string,
  documentId: string,
): Promise<AdminKycDocumentUrl> {
  return apiFetch<AdminKycDocumentUrl>(
    `/admin/kyc/${encodeURIComponent(technicianId)}/documents/${encodeURIComponent(documentId)}/url`,
  );
}

export async function updateAdminKycStatus(
  technicianId: string,
  status: 'VERIFIED' | 'REJECTED',
  reason?: string,
): Promise<AdminKycDetail> {
  return apiFetch<AdminKycDetail>(
    `/admin/kyc/${encodeURIComponent(technicianId)}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason: reason?.trim() || undefined }),
    },
  );
}