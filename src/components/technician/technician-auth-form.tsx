'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import { signIn, signUp } from '@/lib/api/auth-service';
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
      if (isSignUp) {
        await signUp({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          role: 'TECHNICIAN',
          city: city.trim(),
          categories,
        });
      } else {
        await signIn({ email: email.trim(), password });
      }
      router.push('/technicien');
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
          <span className="mb-1.5 block text-sm font-medium">Nom *</span>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" autoComplete="family-name" />
        </label>
      ) : null}

      {isSignUp ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Téléphone *</span>
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

      {isSignUp ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Ville d&apos;intervention *</span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex. : Lyon" autoComplete="address-level2" />
        </label>
      ) : null}

      {isSignUp ? (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Catégories de réparation *</span>
          <div className="grid gap-2" role="group" aria-label="Catégories maîtrisées">
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
                    'rounded-lg border p-3 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-secondary text-secondary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted',
                  )}
                >
                  <span className="font-medium">{cat.label}</span>
                  {cat.description ? (
                    <span className="ml-2 text-xs text-muted-foreground">{cat.description}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" isLoading={isSubmitting} disabled={!canSubmit}>
        {isSignUp ? 'Créer mon compte technicien' : 'Se connecter'}
      </Button>
    </form>
  );
}