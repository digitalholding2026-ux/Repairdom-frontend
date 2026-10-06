'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  ApiError,
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  signIn,
  signUp,
  type AuthUser,
} from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Chantier D2 — modale d'authentification du wizard ANONYME.
 *
 * Le visiteur remplit sa demande sans compte, puis s'inscrit ou se connecte
 * ICI, au clic sur « Envoyer ». La modale ne ferme jamais seule : c'est le
 * parent (`DemandeWizard`) qui décide, via `onSuccess`, de lancer l'upload et
 * la conversion du brouillon.
 *
 * ⚠️ Elle est AUTONOME et ne réutilise PAS `ClientAuthForm` : ce composant vit
 * sous `/client`, suppose un formulaire en 2 étapes avec ville issue du
 * référentiel, et gère ses propres redirections. Le mutualiser aurait
 * couplé le tunnel public au layout authentifié — exactement la entanglement
 * que le chantier D1 vient de défaire. */

type Tab = 'signup' | 'signin';

export interface DemandeAuthModalProps {
  open: boolean;
  onClose: () => void;
  /* Appelé après inscription OU connexion réussie. Le parent enchaîne sur
   * l'upload des médias puis la conversion du brouillon. */
  onSuccess: (user: AuthUser) => void;
  /* Email déjà connu du wizard (reprise d'une saisie), s'il y en a un. */
  prefillEmail?: string;
  /* `city` et `address` sont EXIGÉS par le backend pour un compte CLIENT
   * (`auth.service.ts` : 400 « Veuillez renseigner votre ville. » sinon). Le
   * wizard les a déjà collectés à l'étape 3 — ils sont donc reportés tels
   * quels, et jamais redemandés à l'utilisateur. */
  city?: string;
  address?: string;
  /* Message d'attente affiché pendant l'upload + la conversion, décidé par le
   * parent (ex. « Envoi des fichiers 2/5… »). */
  busyLabel?: string;
  /* Erreur de l'étape post-auth (upload / conversion), remontée telle quelle. */
  stageError?: string | null;
  /* Options de sortie offertes quand un média n'a pas pu être envoyé. */
  failedMediaCount?: number;
  onRetryMedia?: () => void;
  onSkipMedia?: () => void;
}

/* Règle backend `assertPasswordStrong` (`auth.service.ts`) : 8 caractères
 * minimum, une majuscule, une minuscule, un chiffre. Reproduite ici pour ne
 * pas envoyer une requête qui partira en 400. */
export function isStrongEnough(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export function DemandeAuthModal({
  open,
  onClose,
  onSuccess,
  prefillEmail,
  city,
  address,
  busyLabel,
  stageError,
  failedMediaCount = 0,
  onRetryMedia,
  onSkipMedia,
}: DemandeAuthModalProps) {
  const [tab, setTab] = useState<Tab>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /* Réouverture : on repart d'un onglet propre, sinon le visitor qui ferme la
   * modale en cours de saisie la rouvre avec un mot de passe déjà tapé. */
  useEffect(() => {
    if (!open) return;
    setTab('signup');
    setError(null);
    setInfo(null);
    setPassword('');
    setSubmitting(false);
  }, [open]);

  /* `prefillEmail` peut arriver APRÈS le montage (le parent le renseigne en
   * même temps que `open`). */
  useEffect(() => {
    if (open && prefillEmail) setEmail(prefillEmail);
  }, [open, prefillEmail]);

  const isSignUp = tab === 'signup';
  const passwordOk = isSignUp ? isStrongEnough(password) : password.length > 0;
  const canSubmit =
    !submitting &&
    email.trim() !== '' &&
    passwordOk &&
    (isSignUp
      ? firstName.trim() !== '' && lastName.trim() !== '' && phone.trim() !== '' && acceptTerms
      : true);

  const switchToSignIn = (message: string) => {
    setTab('signin');
    setInfo(message);
    setError(null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      if (isSignUp) {
        /* `city` / `address` sont reportés depuis le wizard (props `city` /
         * `address`) : le backend les exige pour un CLIENT, et le wizard les
         * a déjà collectés à l'étape 3. Sans ce report, l'inscription partirait
         * en 400 « Veuillez renseigner votre ville. ». */
        const session = await signUp({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          city: city?.trim() || undefined,
          address: address?.trim() || undefined,
        });
        onSuccess(session.user);
        return;
      }

      const session = await signIn({ email: email.trim(), password });
      onSuccess(session.user);
    } catch (err) {
      /* 409 = l'adresse existe déjà. Plutôt qu'un message d'erreur, on bascule
       * sur l'onglet connexion avec l'email déjà rempli (décision D1-5) : le
       * visiteur n'a pas à ressaisir ce qu'il vient de taper. */
      if (!isSignUp) {
        if (err instanceof ApiError && err.status === 401 && err.message === EMAIL_VERIFICATION_REQUIRED_MESSAGE) {
          setError(
            'Votre adresse doit être vérifiée avant de vous connecter. Vérifiez votre boîte mail, puis revenez ici.',
          );
        } else {
          setError(toUserErrorMessage(err, 'Connexion impossible. Vérifiez vos identifiants.'));
        }
        setSubmitting(false);
        return;
      }

      if (err instanceof ApiError && err.status === 409) {
        switchToSignIn('Cet email est déjà utilisé. Connectez-vous pour continuer.');
        setSubmitting(false);
        return;
      }

      setError(toUserErrorMessage(err, 'Inscription impossible. Réessayez.'));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      sheet
      title="Presque terminé"
      description="Créez votre compte pour envoyer votre demande — votre progression est déjà enregistrée."
    >
      <div className="space-y-3">
        <div
          role="tablist"
          aria-label="Inscription ou connexion"
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            onClick={() => {
              setTab('signup');
              setError(null);
              setInfo(null);
            }}
            className={
              isSignUp
                ? 'min-h-11 rounded-md bg-card px-3 text-sm font-semibold shadow-sm'
                : 'min-h-11 rounded-md px-3 text-sm text-muted-foreground'
            }
          >
            Créer mon compte
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            onClick={() => {
              setTab('signin');
              setError(null);
              setInfo(null);
            }}
            className={
              !isSignUp
                ? 'min-h-11 rounded-md bg-card px-3 text-sm font-semibold shadow-sm'
                : 'min-h-11 rounded-md px-3 text-sm text-muted-foreground'
            }
          >
            J&rsquo;ai déjà un compte
          </button>
        </div>

        {info ? <Alert variant="info" dense>{info}</Alert> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        {stageError ? <Alert variant="error">{stageError}</Alert> : null}

        {failedMediaCount > 0 && onRetryMedia ? (
          <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
            <p className="text-sm">
              {failedMediaCount} fichier{failedMediaCount > 1 ? 's' : ''} n&rsquo;a
              {failedMediaCount > 1 ? 'ont' : ''} pas pu être envoyé
              {failedMediaCount > 1 ? 's' : ''}. Votre demande peut partir sans.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={onRetryMedia}>
                Réessayer
              </Button>
              {onSkipMedia ? (
                <Button type="button" size="sm" variant="ghost" onClick={onSkipMedia}>
                  Continuer sans
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp ? (
            <>
              <Field label="Prénom" htmlFor="draft-firstName" required>
                <Input
                  id="draft-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </Field>
              <Field label="Nom" htmlFor="draft-lastName" required>
                <Input
                  id="draft-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </Field>
              <Field label="Téléphone" htmlFor="draft-phone" required hint="Pour le technicien qui interviendra.">
                <Input
                  id="draft-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="6XX XXX XXX"
                  required
                />
              </Field>
            </>
          ) : null}

          <Field label="Adresse e-mail" htmlFor="draft-email" required>
            <Input
              id="draft-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="vous@exemple.cm"
              required
            />
          </Field>

          <Field
            label="Mot de passe"
            htmlFor="draft-password"
            required
            error={
              isSignUp && password.length > 0 && !isStrongEnough(password)
                ? '8 caractères minimum, avec une majuscule, une minuscule et un chiffre.'
                : null
            }
            hint={isSignUp ? '8 caractères minimum, une majuscule, une minuscule et un chiffre.' : undefined}
          >
            <Input
              id="draft-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
          </Field>

          {isSignUp ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 size-4"
                required
              />
              <span>
                J&rsquo;accepte les{' '}
                <a href="/conditions-utilisation" target="_blank" rel="noreferrer" className="underline">
                  Conditions d&rsquo;utilisation
                </a>{' '}
                de Relio.
              </span>
            </label>
          ) : (
            <a
              href="/mot-de-passe-oublie"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-primary underline"
            >
              Mot de passe oublié&nbsp;?
            </a>
          )}

          <Button type="submit" isLoading={submitting} disabled={!canSubmit} className="w-full" size="lg">
            {busyLabel ?? (isSignUp ? 'Créer mon compte et envoyer' : 'Se connecter')}
          </Button>
        </form>
      </div>
    </Modal>
  );
}