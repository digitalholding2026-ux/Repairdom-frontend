'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Field, Input, Textarea } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import {
  sendAdminTechnicianMessage,
  type AdminTechnicianMessage,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Communication ADMIN → TECHNICIEN : l'admin saisit l'email du compte
 * technicien (résolu côté backend) et un message. Le technicien reçoit une
 * notification dans son espace Relio (section Notifications). */

export default function AdminCommunicationPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<AdminTechnicianMessage | null>(null);

  const handleSend = async () => {
    const target = email.trim();
    const content = message.trim();
    if (!target || !content) return;
    setSending(true);
    setError(null);
    setSent(null);
    try {
      const result = await sendAdminTechnicianMessage(target, content);
      setSent(result);
      setMessage('');
    } catch (err) {
      setError(toUserErrorMessage(err, "Erreur lors de l'envoi."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Communication"
        description="Envoyez un message direct à un technicien : il apparaîtra dans ses notifications Relio."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {sent ? (
        <Alert variant="success">
          Message envoyé à {sent.technician.firstName} {sent.technician.lastName ?? ''} (
          {sent.technician.email}) — notification créée dans son espace.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="space-y-3 pt-4">
          <Field label="Email du technicien" htmlFor="techEmail" required>
            <Input
              id="techEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="technicien@email.com"
              autoComplete="off"
            />
          </Field>
          <Field
            label="Message"
            htmlFor="techMessage"
            required
            hint={`${message.trim().length}/1000 caractères`}
          >
            <Textarea
              id="techMessage"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Ex. : Votre vérification d’identité doit être complétée avant…"
            />
          </Field>
          <Button
            onClick={() => void handleSend()}
            isLoading={sending}
            disabled={!email.trim() || !message.trim()}
          >
            <Icon name="send" size="3.5" />
            Envoyer le message
          </Button>
          <p className="text-xs text-muted-foreground">
            Email inexistant ou compte non-technicien : envoi refusé avec un message
            d&apos;erreur explicite. Aucun doublon : chaque envoi crée une seule notification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
