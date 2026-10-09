'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import { signIn, signUp, homePathForRole, safeRedirect, ApiError, EMAIL_VERIFICATION_REQUIRED_MESSAGE } from '@/lib/api/auth-service';
import { listCities, type City } from '@/lib/api/cities-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { useAuth } from '@/components/auth/auth-provider';
import { cn } from '@/lib/cn';

export type TechnicianAuthMode = 'signup' | 'signin';

interface TechnicianAuthFormProps {
  mode: TechnicianAuthMode;
  /** Style sombre (coquille `AuthSplit`, chantier #5B). */
  dark?: boolean;
  /** Remonte le % de complétion du formulaire (mode inscription), pour la
   *  barre de progression de la coquille split — symétrie `ClientAuthForm`. */
  onProgressChange?: (percent: number) => void;
}

// Aligné sur le contrat backend (@MinLength(8) sur le mot de passe).
const MIN_PASSWORD_LENGTH = 8;

/* Fond des champs sur la coquille sombre.
 *
 * Le theme par defaut pose `bg-card` (blanc) et une bordure de theme. Sur le
 * fond nuit de la coquille, un blanc pur eblouis et une bordure claire se
 * confond avec lui : les champs devenaient invisibles, et le visiteur ne
 * savait pas ou saisir. Le blanc a 5 % donne un gris perceptible sur le nuit
 * sans surexposer dans l'oeil, la bordure a 10 % se distingue sans crier.
 *
 * `dark` est deja teste dans ce fichier (coquille split) ; hors de la coquille
 * sombre, le theme par defaut s'applique — d'ou la surcharge conditionnelle
 * plutot qu'une classe posee en dur. */
const FIELD_SURFACE = 'h-12 rounded-xl bg-white/5 text-white placeholder:text-white/40 focus:border-orange-500 focus-visible:ring-orange-500/30 transition-colors';

const CATEGORY_ICON: Record<string, import('@/components/ui/icon').IconName> = {
  electricite: 'zap',
  plomberie: 'droplet',
  climatisation: 'thermometer',
  electromenager: 'settings',
  serrurerie: 'shield',
  informatique: 'cpu',
  autre: 'wrench',
};

export function TechnicianAuthForm({ mode, dark = false, onProgressChange }: TechnicianAuthFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  /* Chantier #5B — `cityId` (référence `ServiceCity`), PLUS le texte `city`.
   * Le backend exige la référence pour un technicien et en déduit le nom ;
   * on conserve `city` en mémoire pour afficher la ville choisie sans
   * dépendre d'un second aller-retour. */
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  /* Villes du référentiel. `GET /cities` est PUBLIC : aucun JWT requis, donc
   * l'inscription fonctionne même avant authentification. Un échec réseau est
   * affiché avec un bouton « Réessayer » : sans les villes, le technicien ne
   * peut pas choisir sa ville de référence et ne peut donc pas s'inscrire —
   * on ne masque jamais ce blocage derrière un champ vide. */
  const loadCities = useCallback(async () => {
    setCitiesLoading(true);
    setCitiesError(null);
    try {
      setCities(await listCities());
    } catch {
      setCitiesError('Impossible de charger les villes. Réessayez.');
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignUp) return;
    void loadCities();
  }, [isSignUp, loadCities]);

  const toggleCategory = (id: string) => {
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  /* Complétion (mode inscription) : identité, contact, ville de RÉFÉRENCE,
   * compétences, e-mail, mot de passe. Reflète exactement `canSubmit`. */
  const steps = useMemo(
    () =>
      isSignUp
        ? [
            firstName.trim() !== '',
            lastName.trim() !== '',
            phone.trim() !== '',
            cityId !== '',
            categories.length > 0,
            email.trim() !== '',
            password.length >= MIN_PASSWORD_LENGTH,
          ]
        : [email.trim() !== '', password.length >= MIN_PASSWORD_LENGTH],
    [isSignUp, firstName, lastName, phone, cityId, categories.length, email, password],
  );

  useEffect(() => {
    if (!isSignUp || !onProgressChange) return;
    const done = steps.filter(Boolean).length;
    onProgressChange(Math.round((done / steps.length) * 100));
  }, [isSignUp, onProgressChange, steps]);

  const canSubmit =
    email.trim() !== '' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (!isSignUp ||
      (firstName.trim() !== '' &&
        lastName.trim() !== '' &&
        phone.trim() !== '' &&
        /* Référence de ville exigée : sans elle le backend refuse
         * l'inscription (elle est ce qui rattache au référentiel). */
        cityId !== '' &&
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
            /* Chantier #5B — on envoie la RÉFÉRENCE, pas le texte. Le backend
             * valide l'existence + l'activité de la ville et en déduit le
             * nom : le frontend n'a donc plus à envoyer `city`. */
            cityId,
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
              className={cn(dark && FIELD_SURFACE)}
            />
          </Field>
          <Field label="Nom *" htmlFor="tech-lastName">
            <Input
              id="tech-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Votre nom"
              autoComplete="family-name"
              className={cn(dark && FIELD_SURFACE)}
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
            placeholder="+237 6XX XX XX XX"
            inputMode="tel"
            autoComplete="tel"
            className={cn(dark && FIELD_SURFACE)}
          />
        </Field>
      ) : null}

      <Field label="Adresse e-mail *" htmlFor="tech-email">
        <Input
          id="tech-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="vous@exemple.cm"
          autoComplete="email"
          className={cn(dark && FIELD_SURFACE)}
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
            className={cn('pr-10', dark && FIELD_SURFACE)}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition-colors hover:text-white"
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
        {!isSignUp ? (
          <p className="text-right text-xs">
            <Link
              href="/mot-de-passe-oublie"
              className={
                dark
                  ? 'text-slate-300 underline-offset-4 hover:text-orange-400 hover:underline'
                  : 'text-muted-foreground underline-offset-4 hover:text-primary hover:underline'
              }
            >
              Mot de passe oublié ?
            </Link>
          </p>
        ) : null}
      </Field>

      {/* ── Ville de référence (chantier #5B) ──────────────────────────
          Un `Select` alimenté par `GET /cities`, PLUS un champ texte. Le
          texte libre ne rattachait jamais le compte au référentiel : le
          technicien se retrouvait sans ville exploitable et le formulaire
          `/zones` ne pouvait rien lui proposer. */}
      {isSignUp ? (
        <Field label="Ville d’intervention *" htmlFor="tech-city">
          {citiesError ? (
            <div className="space-y-2">
              <Alert variant="error" dense>
                {citiesError}
              </Alert>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void loadCities()}
                isLoading={citiesLoading}
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <>
              <Select
                id="tech-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                disabled={citiesLoading || cities.length === 0}
                className={cn(dark && FIELD_SURFACE)}
              >
                <option value="">
                  {citiesLoading
                    ? 'Chargement des villes…'
                    : cities.length === 0
                      ? 'Aucune ville disponible'
                      : 'Sélectionnez votre ville'}
                </option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </Select>
              {citiesLoading ? (
                <p className={cn('mt-1.5 flex items-center gap-1.5 text-xs', dark ? 'text-white/50' : 'text-muted-foreground')}>
                  <Spinner size="sm" />
                  Chargement des villes…
                </p>
              ) : (
                <p className={cn('mt-1.5 text-xs', dark ? 'text-white/50' : 'text-muted-foreground')}>
                  Votre ville détermine les missions que vous recevez et les zones que vous
                  pouvez couvrir.
                </p>
              )}
            </>
          )}
        </Field>
      ) : null}

      {isSignUp ? (
        <div className="space-y-2">
          <span className="block text-sm font-medium">
            Catégories de réparation *{' '}
            {categories.length > 0 ? (
              <span className={cn('text-xs', dark ? 'text-white/60' : 'text-muted-foreground')}>
                ({categories.length} sélectionnée{categories.length > 1 ? 's' : ''})
              </span>
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
                    'flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40',
                    /* Sur la coquille split (fond `slate-950`), les jetons de
                       thème (`bg-card`, `text-foreground`) produiraient des
                       cartes CLAIRES sur fond sombre. Mêmes classes que
                       `ClientAuthForm` : pas de changement de design system,
                       seulement le pendant sombre du même composant.
                       La sélection pose un voile orange ET une bordure orange :
                       un seul des deux ne suffit pas — la bordure seule
                       disparaissait sur un fond aussi sombre que le voile. */
                    selected
                      ? dark
                        ? 'border-orange-500 bg-orange-500/15 text-white'
                        : 'border-primary bg-secondary text-secondary-foreground'
                      : dark
                        ? 'border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10'
                        : 'border-border bg-card text-foreground hover:bg-muted',
                  )}
                >
                  <Icon
                    name={CATEGORY_ICON[cat.id] ?? 'wrench'}
                    className={cn(
                      'size-4 shrink-0',
                      selected
                        ? dark
                          ? 'text-orange-400'
                          : 'text-primary'
                        : dark
                          ? 'text-white/60'
                          : 'text-muted-foreground',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{cat.label}</span>
                    {cat.description ? (
                      <span className="ml-1 hidden text-xs sm:inline">
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

      {/* Le design system n'a qu'un etat « desactive » : le bouton y reste
          orange, simplement attenue. Sur fond sombre, un orange attenue
          se lit comme une couleur terne, pas comme une action indisponible —
          le visiteur ne distingueait pas « pas encore valide » d'« actifs ».
          L'etat inactif prend donc un gris neutre, et l'orange vif est
          reserve au moment ou l'action devient possible. */}
      <Button
        type="submit"
        size="lg"
        isLoading={isSubmitting}
        disabled={!canSubmit}
        data-enabled={canSubmit}
        className={cn(
          'w-full transition-colors',
          canSubmit
            ? 'bg-primary text-primary-foreground opacity-100 hover:bg-primary-hover'
            : 'bg-muted text-muted-foreground opacity-60',
        )}
      >
        {isSignUp ? 'Créer mon compte technicien' : 'Se connecter'}
      </Button>
    </form>
  );
}