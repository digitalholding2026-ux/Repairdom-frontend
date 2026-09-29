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

/* IA-3 — diagnostic libre + devis sur DESKTOP : composition deux colonnes
 * (texte à gauche, voix + prix + envoi à droite). Mêmes données, mêmes
 * validations et mêmes appels que la vue mobile. */

export function FreeDiagnosticDesktopView({ data }: { data: FreeDiagnosticData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <Field
            label="Diagnostic principal *"
            htmlFor="free-diag-content-desktop"
            hint={`${data.content.trim().length} / ${FREE_DIAGNOSTIC_MAX_LENGTH} caractères`}
            error={data.contentError}
          >
            <Textarea
              id="free-diag-content-desktop"
              value={data.content}
              onChange={(e) => data.setContent(e.target.value)}
              rows={6}
              maxLength={FREE_DIAGNOSTIC_MAX_LENGTH}
              placeholder="Ex. : carte mère hors service, remplacement nécessaire avec test complet."
              disabled={data.submitting}
            />
          </Field>
          <Field
            label="Explications et observations (facultatif)"
            htmlFor="free-diag-explanation-desktop"
            hint="Symptômes, cause supposée, travaux et pièces nécessaires."
          >
            <Textarea
              id="free-diag-explanation-desktop"
              value={data.explanation}
              onChange={(e) => data.setExplanation(e.target.value)}
              rows={4}
              maxLength={FREE_DIAGNOSTIC_MAX_LENGTH}
              placeholder="Ex. : tests écran, batterie et chargeur concluants ; écran à commander."
              disabled={data.submitting}
            />
          </Field>
        </div>
        <div className="space-y-4">
          <Field
            label="Note vocale (facultatif)"
            hint="Expliquez oralement le diagnostic (3 min max). Rien n'est envoyé sans validation."
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
            htmlFor="free-diag-amount-desktop"
            hint="Entier XAF, sans comparaison au barème dans ce parcours."
            error={data.amountError}
          >
            <Input
              id="free-diag-amount-desktop"
              inputMode="numeric"
              value={data.amount}
              onChange={(e) => data.setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
              placeholder="Ex. : 25000"
              disabled={data.submitting}
              className="tabular-nums"
            />
          </Field>
        </div>
      </div>
      {data.uploadStatus ? <Alert variant="info" dense>{data.uploadStatus}</Alert> : null}
      {data.error ? <Alert variant="error">{data.error}</Alert> : null}
      <Button onClick={data.submit} isLoading={data.submitting} disabled={!data.canSubmit} className="w-full sm:w-auto">
        <Icon name="send" size="sm" />
        Envoyer le diagnostic et le devis
      </Button>
      <p className="text-xs text-muted-foreground">
        Devis manuel : aucune comparaison au barème, workflow de devis existant (le client accepte ou refuse).
      </p>
    </div>
  );
}
