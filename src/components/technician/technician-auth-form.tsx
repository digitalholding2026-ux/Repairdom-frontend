'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import { signIn, signUp, homePathForRole } from '@/lib/api/auth-service';
import { cn } from '@/lib/cn';

export type TechnicianAuthMode = 'signup' | 'signin';

interface TechnicianAuthFormProps {
  mode: TechnicianAuthMode;
}

const MIN_PASSWORD_LENGTH = 6;

export function TechnicianAuthForm({ mode }: TechnicianAuthFormProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      router.push(homePathForRole(session.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.');
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
        <Input
          id="tech-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />
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
                    name="wrench"
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