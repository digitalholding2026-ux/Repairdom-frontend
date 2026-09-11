'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { listCities, type City } from '@/lib/api/cities-service';
import { signIn, signUp, homePathForRole, safeRedirect } from '@/lib/api/auth-service';
import { useAuth } from '@/components/auth/auth-provider';

export type ClientAuthMode = 'signup' | 'signin';

interface ClientAuthFormProps {
  mode: ClientAuthMode;
}

export function ClientAuthForm({ mode }: ClientAuthFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();
  const isSignUp = mode === 'signup';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignUp) return;
    listCities().then(setCities).catch(() => {});
  }, [isSignUp]);

  const passwordValid = password.length >= 8;
  const passwordsMatch = isSignUp ? password === confirmPassword : true;
  const cityValue = city || '';

  const canSubmit =
    email.trim() !== '' &&
    passwordValid &&
    passwordsMatch &&
    (isSignUp ? firstName.trim() !== '' && lastName.trim() !== '' && cityValue.trim() !== '' && address.trim() !== '' && acceptTerms : true);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const session = await signUp({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          email: email.trim(),
          password,
          role: 'CLIENT',
          city: cityValue.trim() || undefined,
          address: address.trim() || undefined,
        });
        // Si le compte est déjà vérifié (ancien compte), rediriger vers l'habitacle.
        // Sinon, rediriger vers la page de vérification email.
        if (session.user.emailVerified === false) {
          router.push(`/client/verification?email=${encodeURIComponent(session.user.email)}`);
        } else {
          await refresh();
          router.push(safeRedirect(window.location.search, '/client', homePathForRole(session.user.role)));
        }
        return;
      }

      await signIn({ email: email.trim(), password });
      await refresh();
      router.push(safeRedirect(window.location.search, '/client', '/client'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp ? (
        <Field label="Prénom" htmlFor="client-firstName" required>
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
        <Field label="Nom" htmlFor="client-lastName" required>
          <Input
            id="client-lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Votre nom"
            autoComplete="family-name"
          />
        </Field>
      ) : null}

      {isSignUp ? (
        <Field label="Téléphone" htmlFor="client-phone" hint="WhatsApp de préférence" required>
          <Input
            id="client-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="6XX XXX XXX"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
      ) : null}

      {isSignUp ? (
        <Field label="WhatsApp (facultatif)" htmlFor="client-whatsapp">
          <Input
            id="client-whatsapp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="6XX XXX XXX"
            inputMode="tel"
          />
        </Field>
      ) : null}

      <Field label="Adresse e-mail" htmlFor="client-email" required>
        <Input
          id="client-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="vous@exemple.com"
          autoComplete="email"
        />
      </Field>

      {isSignUp ? (
        <Field label="Ville" htmlFor="client-city" required>
          <Select id="client-city" value={cityValue} onChange={(e) => setCity(e.target.value)}>
            <option value="">Sélectionnez votre ville</option>
            {cities.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {isSignUp ? (
        <Field
          label="Adresse précise"
          htmlFor="client-address"
          hint="Quartier, rue, lieu-dit, numéro de maison…"
          required
        >
          <Input
            id="client-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Quartier, rue, lieu-dit, numéro de maison…"
            autoComplete="street-address"
          />
        </Field>
      ) : null}

      <Field label="Mot de passe" htmlFor="client-password" required>
        <div className="relative">
          <Input
            id="client-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? 'text' : 'password'}
            placeholder="Au moins 8 caractères"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className="pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {isSignUp && password.length > 0 && !passwordValid ? (
          <p className="text-xs text-error-ink">Minimum 8 caractères</p>
        ) : null}
        {isSignUp && password.length > 0 && passwordValid ? (
          <p className="text-xs text-success-ink">Mot de passe valide</p>
        ) : null}
      </Field>

      {isSignUp ? (
        <Field label="Confirmer le mot de passe" htmlFor="client-confirmPassword" required>
          <Input
            id="client-confirmPassword"
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
      ) : null}

      {isSignUp ? (
        <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
            required
          />
          <span className="text-muted-foreground">
            J&apos;accepte les{' '}
            <Link href="/conditions-utilisation" className="font-medium text-primary underline-offset-2 hover:underline">
              Conditions d&apos;utilisation
            </Link>{' '}
            de RepairDom.
          </span>
        </label>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting} disabled={!canSubmit}>
        {isSignUp ? 'Créer mon compte' : 'Se connecter'}
      </Button>
    </form>
  );
}