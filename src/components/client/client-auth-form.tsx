'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { listCities, type City } from '@/lib/api/cities-service';
import { signIn, signUp, homePathForRole, safeRedirect, ApiError, EMAIL_VERIFICATION_REQUIRED_MESSAGE } from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { useAuth } from '@/components/auth/auth-provider';

export type ClientAuthMode = 'signup' | 'signin';

interface ClientAuthFormProps {
  mode: ClientAuthMode;
  /** Style sombre (panneau glassmorphism sur fond #0B0D12). */
  dark?: boolean;
  /** Remonte le % de complétion + l'identité saisie (mode inscription)
   * pour la mascotte / progression / aperçu profil en direct. */
  onProgressChange?: (percent: number, identity?: { firstName: string; lastName: string }) => void;
}

export function ClientAuthForm({ mode, dark = false, onProgressChange }: ClientAuthFormProps) {
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
  /* Formulaire multi-step (inscription uniquement) :
   * étape 1 = Identité & Contact, étape 2 = Localisation & Sécurité. */
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!isSignUp) return;
    listCities().then(setCities).catch(() => {});
  }, [isSignUp]);

  const passwordValid = password.length >= 8;
  const passwordsMatch = isSignUp ? password === confirmPassword : true;
  const cityValue = city || '';
  const emailValid = /\S+@\S+\.\S+/.test(email.trim());

  /* Passage à l'étape 2 : identité + contact valides. */
  const canContinue =
    firstName.trim() !== '' && lastName.trim() !== '' && emailValid;

  const darkCtaClass =
    'h-auto w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/20 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 min-h-12 text-sm sm:text-base';

  const canSubmit =
    email.trim() !== '' &&
    passwordValid &&
    passwordsMatch &&
    (isSignUp ? firstName.trim() !== '' && lastName.trim() !== '' && cityValue.trim() !== '' && address.trim() !== '' && acceptTerms : true);

  /* Complétion (inscription) : prénom, nom, e-mail, ville, adresse,
   * mot de passe valide, confirmation concordante, CGU acceptées.
   * Garde anti-recalcul : le parent n'est notifié que si le % ou
   * l'identité a réellement changé (pas de setState à chaque frappe). */
  const lastProgress = useRef<{ percent: number; firstName: string; lastName: string } | null>(null);
  useEffect(() => {
    if (!isSignUp || !onProgressChange) return;
    const steps = [
      firstName.trim() !== '',
      lastName.trim() !== '',
      email.trim() !== '',
      cityValue.trim() !== '',
      address.trim() !== '',
      passwordValid,
      confirmPassword !== '' && passwordsMatch,
      acceptTerms,
    ];
    const percent = Math.round((steps.filter(Boolean).length / steps.length) * 100);
    const identity = { firstName: firstName.trim(), lastName: lastName.trim() };
    const prev = lastProgress.current;
    if (
      !prev ||
      prev.percent !== percent ||
      prev.firstName !== identity.firstName ||
      prev.lastName !== identity.lastName
    ) {
      lastProgress.current = { percent, ...identity };
      onProgressChange(percent, identity);
    }
  }, [isSignUp, onProgressChange, firstName, lastName, email, cityValue, address, passwordValid, confirmPassword, passwordsMatch, acceptTerms]);

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
      const message = toUserErrorMessage(err, 'Une erreur est survenue. Réessayez.');
      const attemptedEmail = email.trim();
      // Compte existant (inscription sur email déjà pris) : orienter vers la
      // page de vérification de CETTE adresse (le renvoi y est possible si le
      // compte n’est pas vérifié, silencieux sinon — sans fuite supplémentaire,
      // le 409 révélant déjà l’existence).
      if (isSignUp && err instanceof ApiError && err.status === 409 && attemptedEmail) {
        setIsSubmitting(false);
        router.push(`/client/verification?email=${encodeURIComponent(attemptedEmail)}`);
        return;
      }
      // Compte non vérifié : le backend refuse le login (401). Reboucler vers
      // la vérification plutôt qu’afficher une impasse.
      if (!isSignUp && message === EMAIL_VERIFICATION_REQUIRED_MESSAGE && attemptedEmail) {
        setIsSubmitting(false);
        router.push(`/client/verification?email=${encodeURIComponent(attemptedEmail)}`);
        return;
      }
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp ? (
        <div role="group" aria-label="Étapes d'inscription">
          <ol className="flex items-center gap-2 text-xs font-semibold">
            <li aria-current={step === 1 ? 'step' : undefined} className={step === 1 ? 'text-orange-400' : 'text-emerald-300'}>
              1. Identité &amp; Contact
            </li>
            <li aria-hidden className="h-px flex-1 bg-white/10" />
            <li aria-current={step === 2 ? 'step' : undefined} className={step === 2 ? 'text-orange-400' : 'text-slate-400'}>
              2. Localisation &amp; Sécurité
            </li>
          </ol>
          <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-[width] duration-500 ease-out"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={isSignUp ? `signup-step-${step}` : 'signin'}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="space-y-4"
      >
      {isSignUp && step === 1 ? (
        <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" htmlFor="client-firstName" required>
          <Input
            id="client-firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Votre prénom"
            autoComplete="given-name"
          />
        </Field>
        <Field label="Nom" htmlFor="client-lastName" required>
          <Input
            id="client-lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Votre nom"
            autoComplete="family-name"
          />
        </Field>
        </div>
      ) : null}

      {isSignUp ? (
        step === 1 ? (
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
        ) : null
      ) : null}

      {isSignUp ? (
        step === 1 ? (
        <Field label="WhatsApp (facultatif)" htmlFor="client-whatsapp">
          <Input
            id="client-whatsapp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="6XX XXX XXX"
            inputMode="tel"
          />
        </Field>
        ) : null
      ) : null}

      {!isSignUp || step === 1 ? (
      <Field label="Adresse e-mail" htmlFor="client-email" required>
        <Input
          id="client-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="vous@exemple.cm"
          autoComplete="email"
        />
      </Field>
      ) : null}

      {isSignUp && step === 2 ? (
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

      {isSignUp && step === 2 ? (
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

      {!isSignUp || step === 2 ? (
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
        {isSignUp && password.length > 0 && !passwordValid ? (
          <p className="text-xs text-error-ink">Minimum 8 caractères</p>
        ) : null}
        {isSignUp && password.length > 0 && passwordValid ? (
          <p className="text-xs text-success-ink">Mot de passe valide</p>
        ) : null}
      </Field>
      ) : null}

      {isSignUp && step === 2 ? (
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

      {isSignUp && step === 2 ? (
        <label className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${dark ? 'border-slate-700/80 bg-slate-800/60' : 'border-border bg-card'}`}>
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
            required
          />
          <span className={dark ? 'text-slate-300' : 'text-muted-foreground'}>
            J&apos;accepte les{' '}
            <Link href="/conditions-utilisation" className="font-medium text-primary underline-offset-2 hover:underline">
              Conditions d&apos;utilisation
            </Link>{' '}
            de Relio.
          </span>
        </label>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      {isSignUp && step === 1 ? (
        <Button
          type="button"
          size="lg"
          disabled={!canContinue}
          onClick={() => setStep(2)}
          className={dark ? darkCtaClass : 'w-full'}
        >
          Continuer
          <span aria-hidden>→</span>
        </Button>
      ) : null}

      {isSignUp && step === 2 ? (
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={() => setStep(1)}
            disabled={isSubmitting}
            className={dark ? 'min-h-12 w-full border-slate-700/80 bg-slate-800/60 text-slate-100 hover:bg-slate-800 text-sm sm:w-auto sm:text-base' : 'w-full sm:w-auto'}
          >
            <span aria-hidden>←</span>
            Retour
          </Button>
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            disabled={!canSubmit}
            className={dark ? `${darkCtaClass} sm:w-auto sm:flex-1` : 'w-full flex-1'}
          >
            Créer mon compte
          </Button>
        </div>
      ) : null}

      {!isSignUp ? (
      <Button
        type="submit"
        size="lg"
        isLoading={isSubmitting}
        disabled={!canSubmit}
        className="w-full"
      >
        Se connecter
      </Button>
      ) : null}
      </motion.div>
      </AnimatePresence>
    </form>
  );
}