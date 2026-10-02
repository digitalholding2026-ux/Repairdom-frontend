'use client';

import { type FormEvent, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { requestPasswordReset } from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Une erreur est survenue. Réessayez.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Alert variant="success">
        Si un compte existe avec cet e-mail, vous recevrez un lien dans quelques minutes. Pensez à
        vérifier vos spams.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Adresse e-mail" htmlFor="forgot-email" required>
        <Input
          id="forgot-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="vous@exemple.cm"
          autoComplete="email"
        />
      </Field>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!emailValid} className="w-full">
        Envoyer le lien
      </Button>
    </form>
  );
}
