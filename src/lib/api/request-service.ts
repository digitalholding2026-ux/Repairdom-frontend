import { siteConfig } from '@/lib/site-config';

// ============================================================
// Couche d'abstraction API côté client.
// Aujourd'hui le backend n'est pas encore connecté : les
// fonctions concernées retournent des données simulées (MOCK).
// Quand l'API sera disponible, il suffira de supprimer la
// branche mock et d'utiliser la branche réelle (fetch).
// ============================================================

export interface RequestMedia {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface RequestLocation {
  city: string;
  address?: string;
}

export interface CreateDemandeInput {
  categoryId: string;
  description: string;
  medias: Array<{ name: string; type: string; size: number }>;
  city: string;
  address?: string;
}

export interface CreateDemandeResult {
  id: string;
  status: 'created';
  createdAt: string;
  mode: 'mock';
}

const MOCK_CREATION_DELAY_MS = 900;

function randomRequestId(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RD-${suffix}`;
}

function asyncMockCreateDemande(input: CreateDemandeInput): Promise<CreateDemandeResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: randomRequestId(),
        status: 'created',
        createdAt: new Date().toISOString(),
        mode: 'mock',
      });
    }, MOCK_CREATION_DELAY_MS);
  });
}

async function realCreateDemande(input: CreateDemandeInput): Promise<CreateDemandeResult> {
  const response = await fetch(`${siteConfig.apiBaseUrl}/demandes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Erreur lors de la création de la demande (${response.status})`);
  }

  return response.json();
}

export async function createDemande(input: CreateDemandeInput): Promise<CreateDemandeResult> {
  // MOCK : retour simulé utilisé tant que le backend n'est pas branché.
  return asyncMockCreateDemande(input);
  // À activer quand l'API sera disponible :
  // return realCreateDemande(input);
}