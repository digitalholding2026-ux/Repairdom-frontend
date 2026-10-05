import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthSplit } from '@/components/auth/auth-split';
import { ClientAuthForm } from '@/components/client/client-auth-form';

export const metadata: Metadata = {
  title: 'Se connecter',
};

/* Connexion : même coquille split que l'inscription (identité cohérente sur
 * tout le tunnel d'entrée). La logique d'authentification et la propagation
 * de `?redirect=` restent gérées intégralement par `ClientAuthForm`. */
export default function ConnexionPage() {
  return (
    <AuthSplit
      title="Se connecter"
      subtitle="Reprenez le suivi de vos demandes de dépannage."
      footer={
        <p className="text-center text-sm text-slate-300">
          Nouveau sur Relio ?{' '}
          <Link
            href="/client/inscription"
            className="font-medium text-orange-400 underline-offset-4 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      }
    >
      <ClientAuthForm mode="signin" dark />
    </AuthSplit>
  );
}