'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { useFreeDiagnostic } from './use-free-diagnostic';
import { FreeDiagnosticDesktopView } from './free-diagnostic-desktop-view';
import { FreeDiagnosticMobileView } from './free-diagnostic-mobile-view';

/* IA-3 — section « Diagnostic libre et devis » (technicien assigné) :
 * éléments client déjà visibles sur la page, puis diagnostic principal
 * obligatoire + explication/voix facultatives + prix XAF → devis MANUAL
 * via le workflow existant (aucun catalogue requis, aucun appel IA).
 * Une seule vue montée (ResponsiveView), données partagées. */
export function FreeDiagnosticSection({
  demandeId,
  onDone,
}: {
  demandeId: string;
  onDone: () => void;
}) {
  const data = useFreeDiagnostic(demandeId, onDone);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="wrench" size="sm" className="text-muted-foreground" />
          Diagnostic libre et devis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveView
          mobile={<FreeDiagnosticMobileView data={data} />}
          desktop={<FreeDiagnosticDesktopView data={data} />}
        />
      </CardContent>
    </Card>
  );
}
