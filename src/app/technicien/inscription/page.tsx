import type { Metadata } from 'next';
import { TechnicianAuthSplit } from '@/components/auth/technician-auth-split';

export const metadata: Metadata = {
  title: 'Créer un compte technicien',
};

/* Chantier #5B — coquille split, alignée sur /client/inscription : visuel de
 * marque, un seul logo (posé par `AuthSplit`, le header global étant masqué sur
 * cette route) et parcours cohérent entre client et technicien. */
export default function TechnicianInscriptionPage() {
  return <TechnicianAuthSplit mode="signup" />;
}