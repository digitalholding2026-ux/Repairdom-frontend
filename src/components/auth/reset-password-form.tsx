'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { resetPassword, validateResetToken } from '@/lib/api/auth-service';
import { isPasswordStrong, passwordRules, passwordStrength } from '@/lib/password-strength';
import { toUserErrorMessage } from '@/lib/ui-error-message';

type Phase = 'checking' | 'invalid' | 'form' | 'done';

const STRENGTH_STYLE: Record<string, { label: string; className: string; width: string }> = {
  faible: { label: 'Faible', className: 'bg-error', width: 'w-1/3' },
  moyen: { label: 'Moyen', className: 'bg-warning', width: 'w-2/3' },
  fort: { label: 'Fort', className: 'bg-success', width: 'w-full' },
};

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState('/client/connexion');

  useEffect(() => {
    if (!token) {
      setPhase('invalid');
      return;
    }
    let cancelled = false;
    validateResetToken(token)
      .then((result) => {
        if (!cancelled) setPhase(result.valid ? 'form' : 'invalid');
      })
      .catch(() => {
        if (!cancelled) setPhase('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (phase !== 'done') return;
    const timer = window.setTimeout(() => {
      router.push(pendingRedirect);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [phase, pendingRedirect, router]);

  if (phase === 'checking') {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <div className="space-y-4">
        <Alert variant="error">Ce lien a expiré ou est invalide. Demandez un nouveau lien.</Alert>
        <Link href="/mot-de-passe-oublie" className="block">
          <Button size="lg" className="w-full">
            Demander un nouveau lien
          </Button>
        </Link>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <Alert variant="success">
        Votre mot de passe a été réinitialisé. Redirection vers la connexion…
      </Alert>
    );
  }

  const rules = passwordRules(password);
  const strength = passwordStrength(password);
  const gauge = STRENGTH_STYLE[strength];
  const passwordsMatch = password !== '' && password === confirmPassword;
  const canSubmit = isPasswordStrong(password) && passwordsMatch && !isSubmitting;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await resetPassword(token, password);
      setPendingRedirect(
        result.role === 'TECHNICIAN' ? '/technicien/connexion' : '/client/connexion',
      );
      setPhase('done');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Une erreur est survenue. Réessayez.'));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nouveau mot de passe" htmlFor="reset-password" required>
        <div className="relative">
          <Input
            id="reset-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? 'text' : 'password'}
            placeholder="Au moins 8 caractères"
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? 'Masquer' : 'Afficher'}
          </button>
        </div>
      </Field>

      <div aria-live="polite">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Force du mot de passe</span>
          <span className="font-semibold">{password === '' ? '—' : gauge.label}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={`h-full rounded-full transition-[width] ${gauge.className} ${password === '' ? 'w-0' : gauge.width}`} />
        </div>
      </div>

      <ul className="space-y-1 text-xs">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={rule.satisfied ? 'text-success-ink' : 'text-muted-foreground'}
          >
            <span aria-hidden>{rule.satisfied ? '✓ ' : '○ '}</span>
            {rule.label}
          </li>
        ))}
      </ul>

      <Field label="Confirmer le mot de passe" htmlFor="reset-confirmPassword" required>
        <Input
          id="reset-confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirmez votre mot de passe"
          autoComplete="new-password"
        />
        {confirmPassword.length > 0 && !passwordsMatch ? (
          <p className="text-xs text-error-ink">Les mots de passe ne correspondent pas</p>
        ) : null}
      </Field>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!canSubmit} className="w-full">
        Réinitialiser mon mot de passe
      </Button>
    </form>
  );
}
