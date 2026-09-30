'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { Alert } from '@/components/ui/alert';
import { useAiWarnings } from '@/components/technician/warnings/use-ai-warnings';
import { WarningsDesktopView, WarningsMobileView } from '@/components/technician/warnings/warnings-views';

/* IA-7 — avertissements tarifaires du technicien (écart au barème,
 * justification 48 h, poursuite normale). Données via hook partagé ;
 * présentation séparée Desktop (tableau) / Mobile (cards). Aucune
 * logique métier critique côté frontend (délais/statuts backend). */
export default function TechnicienAvertissementsPage() {
  const controller = useAiWarnings();
  return (
    <div className="space-y-4">
      <PageHeader
        title="Avertissements tarifaires"
        description="Vos écarts au barème et leurs justifications. Aucune sanction automatique."
        backHref="/technicien"
      />
      <Alert variant="warning">
        Un prix au-dessus du barème demande une justification complémentaire sous 48 h.
        Vous pouvez poursuivre vos missions normalement. Un dépassement de délai signifie
        simplement que la justification n&apos;a pas été reçue à temps.
      </Alert>
      <ResponsiveView mobile={<WarningsMobileView controller={controller} />} desktop={<WarningsDesktopView controller={controller} />} />
      <Link href="/technicien/notifications" className="block">
        <Button variant="secondary" className="w-full">
          <Icon name="bell" size="sm" />
          <span className="ml-1">Voir mes notifications</span>
        </Button>
      </Link>
    </div>
  );
}
