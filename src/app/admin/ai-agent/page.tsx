'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { SkeletonCard } from '@/components/ui/skeleton';
import { AiAgentDesktop, AiAgentMobile } from '@/components/admin/ai-agent/ai-agent-views';
import { useAiAgent } from '@/components/admin/ai-agent/use-ai-agent';

/* IA-11 — Agent IA du back-office (ADMIN, lecture seule) : statistiques,
 * états opérationnels et surveillance sans naviguer. Session uniquement. */
export default function AdminAiAgentPage() {
  const controller = useAiAgent();
  return (
    <div className="space-y-4">
      <PageHeader
        title="Agent IA"
        description="Interrogez l’activité Relio en langage naturel — chiffres réels, aucune modification."
      />
      <ResponsiveView
        mobile={<AiAgentMobile controller={controller} />}
        desktop={<AiAgentDesktop controller={controller} />}
        fallback={<SkeletonCard />}
      />
    </div>
  );
}
