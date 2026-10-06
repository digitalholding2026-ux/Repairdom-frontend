'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TechnicianAuthForm } from '@/components/technician/technician-auth-form';
import { AuthSplit, TECHNICIAN_GUARANTEES } from './auth-split';

/* Coquille split du tunnel technicien (chantier #5B).
 *
 * AVANT : `AuthCard` — colonne unique centrée, logo dupliqué (le header global
 * + celui de la carte), aucun visuel. Le client était passé en split au
 * chantier #3 : le technicien restait le seul point d'entrée incohérent de la
 * marque.
 *
 * APRÈS : la MÊME coquille que le client, une seule implémentation
 * (`AuthSplit`), avec deux différences VOLONTAIRES :
 *   - les garanties de réassurance sont celles du technicien (il ne paie pas,
 *     et c'est son identité qui est contrôlée) ;
 *   - les liens de pied pointent vers le tunnel technicien, pas client.
 *
 * Le seul logo affiché est celui posé par `AuthSplit` : le header global est
 * masqué sur ces routes (cf. technicien/layout.tsx).
 */
export function TechnicianAuthSplit({ mode }: { mode: 'signup' | 'signin' }) {
  const isSignUp = mode === 'signup';
  const [percent, setPercent] = useState(0);

  return (
    <AuthSplit
      badge={isSignUp ? 'Inscription technicien' : undefined}
      title={isSignUp ? 'Rejoignez Relio en tant que technicien' : 'Connexion technicien'}
      subtitle={
        isSignUp
          ? 'Recevez des missions de dépannage près de chez vous.'
          : 'Accédez à vos demandes de dépannage et gérez vos interventions.'
      }
      progress={isSignUp ? percent : undefined}
      guarantees={TECHNICIAN_GUARANTEES}
      footer={
        <p className="text-center text-sm text-slate-300">
          {isSignUp ? 'Déjà technicien ? ' : 'Pas encore de compte ? '}
          <Link
            href={isSignUp ? '/technicien/connexion' : '/devenir-technicien'}
            className="font-medium text-orange-400 underline-offset-4 hover:underline"
          >
            {isSignUp ? 'Se connecter' : 'Devenir technicien'}
          </Link>
        </p>
      }
    >
      <TechnicianAuthForm mode={mode} dark onProgressChange={setPercent} />
    </AuthSplit>
  );
}