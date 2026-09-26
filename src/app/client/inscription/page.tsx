import type { Metadata } from 'next';
import { RegisterSplit } from '@/components/auth/register-split';

export const metadata: Metadata = {
  title: 'Créer un compte',
};

/* NB : le logo unique est celui du header du layout — aucun logo répété
 * au-dessus du formulaire (fix double logo). */
export default function InscriptionPage() {
  return <RegisterSplit />;
}
