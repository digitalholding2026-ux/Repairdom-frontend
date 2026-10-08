'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { VoiceRecorder } from '@/components/client/voice-recorder';
import {
  FREE_DIAGNOSTIC_MAX_LENGTH,
  type FreeDiagnosticData,
} from './use-free-diagnostic';
import { TECHNICIAN_FEE_LABEL } from '@/lib/technician-quote';

/* IA-3 — diagnostic libre + devis sur MOBILE : empilé tactile (diagnostic
 * → explications → voix → prix → envoi), gros contrôles, enregistrement
 * vocal facile. Mêmes données, mêmes validations et mêmes appels que la
 * vue desktop. */

export function FreeDiagnosticMobileView({ data }: { data: FreeDiagnosticData }) {
  return (
    <div className="space-y-4">
      <Field
        label="Diagnostic principal *"
        htmlFor="free-diag-content-mobile"
        hint={`${data.content.trim().length} / ${FREE_DIAGNOSTIC_MAX_LENGTH} caractères`}
        error={data.contentError}
      >
        <Textarea
          id="free-diag-content-mobile"
          value={data.content}
          onChange={(e) => data.setContent(e.target.value)}
          rows={4}
          maxLength={FREE_DIAGNOSTIC_MAX_LENGTH}
          placeholder="Ex. : carte mère hors service, remplacement nécessaire."
          disabled={data.submitting}
        />
      </Field>
      <Field
        label="Explications et observations (facultatif)"
        htmlFor="free-diag-explanation-mobile"
        hint="Symptômes, cause supposée, travaux et pièces nécessaires."
      >
        <Textarea
          id="free-diag-explanation-mobile"
          value={data.explanation}
          onChange={(e) => data.setExplanation(e.target.value)}
          rows={3}
          maxLength={FREE_DIAGNOSTIC_MAX_LENGTH}
          placeholder="Ex. : écran à commander, test complet inclus."
          disabled={data.submitting}
        />
      </Field>
      <Field
        label="Note vocale (facultatif)"
        hint="Expliquez oralement (3 min max). Rien n'est envoyé sans validation."
      >
        <VoiceRecorder
          key={data.voiceKey}
          onValidated={(voice) => data.setVoice(voice)}
          onCleared={() => data.setVoice(null)}
          disabled={data.submitting}
        />
      </Field>
      <Field
        label="Prix proposé (FCFA) *"
        htmlFor="free-diag-amount-mobile"
        hint={`Minimum 5 000 FCFA par intervention. ${TECHNICIAN_FEE_LABEL}.`}
        error={data.amountError}
      >
        <Input
          id="free-diag-amount-mobile"
          inputMode="numeric"
          value={data.amount}
          onChange={(e) => data.setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
          placeholder="Ex. : 25000"
          disabled={data.submitting}
          className="min-h-12 text-base tabular-nums"
        />
      </Field>
      {data.uploadStatus ? <Alert variant="info" dense>{data.uploadStatus}</Alert> : null}
      {data.error ? <Alert variant="error">{data.error}</Alert> : null}
      <Button
        onClick={data.submit}
        isLoading={data.submitting}
        disabled={!data.canSubmit}
        className="min-h-12 w-full text-base"
        size="lg"
      >
        <Icon name="send" size="md" />
        Envoyer le diagnostic et le devis
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Devis manuel : le client accepte ou refuse, sans comparaison au barème.
      </p>
    </div>
  );
}
