'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
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

  const canSubmit =
    email.trim() !== '' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (isSignUp ? firstName.trim() !== '' : true);

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
        <Field label="Prénom *" htmlFor="client-firstName">
          <Input
            id="client-firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Votre prénom"
            autoComplete="given-name"
          />
        </Field>
      ) : null}

      {isSignUp ? (
        <Field label="Téléphone (facultatif)" htmlFor="client-phone">
          <Input
            id="client-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
      ) : null}

      <Field label="Adresse e-mail *" htmlFor="client-email">
        <Input
          id="client-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="vous@exemple.fr"
          autoComplete="email"
        />
      </Field>

      <Field label="Mot de passe *" htmlFor="client-password">
        <Input
          id="client-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />
      </Field>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting} disabled={!canSubmit}>
        {isSignUp ? 'Créer mon compte' : 'Se connecter'}
      </Button>
    </form>
  );
}