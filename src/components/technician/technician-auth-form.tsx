'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import { signIn, signUp, homePathForRole, safeRedirect, ApiError, EMAIL_VERIFICATION_REQUIRED_MESSAGE } from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { useAuth } from '@/components/auth/auth-provider';
import { cn } from '@/lib/cn';

export type TechnicianAuthMode = 'signup' | 'signin';

interface TechnicianAuthFormProps {
  mode: TechnicianAuthMode;
}

// Aligné sur le contrat backend (@MinLength(8) sur le mot de passe).
const MIN_PASSWORD_LENGTH = 8;

const CATEGORY_ICON: Record<string, import('@/components/ui/icon').IconName> = {
  electricite: 'zap',
  plomberie: 'droplet',
  climatisation: 'thermometer',
  electromenager: 'settings',
  serrurerie: 'shield',
  informatique: 'cpu',
  autre: 'wrench',
};

export function TechnicianAuthForm({ mode }: TechnicianAuthFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  const toggleCategory = (id: string) => {
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const canSubmit =
    email.trim() !== '' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (!isSignUp ||
      (firstName.trim() !== '' &&
        lastName.trim() !== '' &&
        phone.trim() !== '' &&
        city.trim() !== '' &&
        categories.length > 0));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const session = isSignUp
        ? await signUp({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            password,
            role: 'TECHNICIAN',
            city: city.trim(),
            categories,
          })
        : await signIn({ email: email.trim(), password });
      // Symétrie CLIENT : un compte non vérifié reste sur la vérification
      // (sans effet tant que le backend vérifie les techniciens à la création).
      if (isSignUp && session.user.emailVerified === false) {
        setIsSubmitting(false);
        router.push(`/technicien/verification?email=${encodeURIComponent(session.user.email)}`);
        return;
      }
      await refresh();
      router.push(safeRedirect(window.location.search, '/technicien', homePathForRole(session.user.role)));
    } catch (err) {
      const message = toUserErrorMessage(err, 'Une erreur est survenue. Réessayez.');
      const attemptedEmail = email.trim();
      if (isSignUp && err instanceof ApiError && err.status === 409 && attemptedEmail) {
        setIsSubmitting(false);
        router.push(`/technicien/verification?email=${encodeURIComponent(attemptedEmail)}`);
        return;
      }
      if (!isSignUp && message === EMAIL_VERIFICATION_REQUIRED_MESSAGE && attemptedEmail) {
        setIsSubmitting(false);
        router.push(`/technicien/verification?email=${encodeURIComponent(attemptedEmail)}`);
        return;
      }
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom *" htmlFor="tech-firstName">
            <Input
              id="tech-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Votre prénom"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Nom *" htmlFor="tech-lastName">
            <Input
              id="tech-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Votre nom"
              autoComplete="family-name"
            />
          </Field>
        </div>
      ) : null}

      {isSignUp ? (
        <Field label="Téléphone *" htmlFor="tech-phone">
          <Input
            id="tech-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
      ) : null}

      <Field label="Adresse e-mail *" htmlFor="tech-email">
        <Input
          id="tech-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="vous@exemple.fr"
          autoComplete="email"
        />
      </Field>

      <Field label="Mot de passe *" htmlFor="tech-password">
        <div className="relative">
          <Input
            id="tech-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? 'text' : 'password'}
            placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className="pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </Field>

      {isSignUp ? (
        <Field label="Ville d’intervention *" htmlFor="tech-city">
          <Input
            id="tech-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex. : Lyon"
            autoComplete="address-level2"
          />
        </Field>
      ) : null}

      {isSignUp ? (
        <div className="space-y-2">
          <span className="block text-sm font-medium">
            Catégories de réparation *{' '}
            {categories.length > 0 ? (
              <span className="text-xs text-muted-foreground">({categories.length} sélectionnée{categories.length > 1 ? 's' : ''})</span>
            ) : null}
          </span>
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Catégories maîtrisées">
            {REQUEST_CATEGORIES.map((cat) => {
              const selected = categories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-secondary text-secondary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted',
                  )}
                >
                  <Icon
                    name={CATEGORY_ICON[cat.id] ?? 'wrench'}
                    className={cn('size-4 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{cat.label}</span>
                    {cat.description ? (
                      <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">
                        {cat.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting} disabled={!canSubmit}>
        {isSignUp ? 'Créer mon compte technicien' : 'Se connecter'}
      </Button>
    </form>
  );
}