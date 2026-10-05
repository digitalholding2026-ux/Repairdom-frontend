'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClientAuthForm } from '@/components/client/client-auth-form';
import { AuthSplit } from './auth-split';

/* Page d'inscription : coquille split partagée avec /client/connexion
 * (formulaire | panneau de réassurance). Le seul logo affiché est celui posé
 * par `AuthSplit` : le header global est masqué sur cette route. */
export function RegisterSplit() {
  const [percent, setPercent] = useState(0);

  return (
    <AuthSplit
      badge="Inscription client"
      title="Créer votre compte client"
      subtitle="Remplissez le formulaire pour déposer vos demandes de dépannage en toute confiance."
      progress={percent}
      footer={
        <p className="text-center text-sm text-slate-300">
          Déjà client ?{' '}
          <Link
            href="/client/connexion"
            className="font-medium text-orange-400 underline-offset-4 hover:underline"
          >
            Se connecter
          </Link>
        </p>
      }
    >
      <ClientAuthForm mode="signup" dark onProgressChange={setPercent} />
    </AuthSplit>
  );
}