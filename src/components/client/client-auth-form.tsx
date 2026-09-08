'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, signUp, homePathForRole } from '@/lib/api/auth-service';

export type ClientAuthMode = 'signup' | 'signin';

interface ClientAuthFormProps {
  mode: ClientAuthMode;
}

const MIN_PASSWORD_LENGTH = 6;

export function ClientAuthForm({ mode }: ClientAuthFormProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  const canSubmit = email.trim() !== '' && password.length >= MIN_PASSWORD_LENGTH && (isSignUp ? firstName.trim() !== '' : true);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const session = isSignUp
        ? await signUp({ firstName: firstName.trim(), phone: phone.trim() || undefined, email: email.trim(), password })
        : await signIn({ email: email.trim(), password });
      router.push(homePathForRole(session.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Prénom *</span>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" autoComplete="given-name" />
        </label>
      ) : null}

      {isSignUp ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Téléphone (facultatif)</span>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" inputMode="tel" autoComplete="tel" />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Adresse e-mail *</span>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="vous@exemple.fr" autoComplete="email" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Mot de passe *</span>
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />
      </label>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={!canSubmit}>
        {isSignUp ? 'Créer mon compte' : 'Se connecter'}
      </Button>
    </form>
  );
}