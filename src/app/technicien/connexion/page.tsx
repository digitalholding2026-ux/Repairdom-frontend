import type { Metadata } from 'next';
import { TechnicianAuthSplit } from '@/components/auth/technician-auth-split';

export const metadata: Metadata = {
  title: 'Connexion technicien',
};

/* Chantier #5B — même coquille split que l'inscription technicien et que le
 * tunnel client : une seule identité visuelle sur tous les points d'entrée.
 * La logique d'authentification et la propagation de `?redirect=` restent
 * entièrement gérées par `TechnicianAuthForm`. */
export default function TechnicianConnexionPage() {
  return <TechnicianAuthSplit mode="signin" />;
}