import { Timeline, type TimelineStep } from '@/components/ui/timeline';
import type { IconName } from '@/components/ui/icon';

interface ProgressStep {
  statuses: string[];
  title: string;
  icon: IconName;
}

export const PROGRESS_STEPS: ProgressStep[] = [
  { statuses: ['SUBMITTED', 'PENDING'], title: 'Demande déposée', icon: 'file' },
  { statuses: ['ACCEPTED'], title: 'Technicien trouvé', icon: 'users' },
  { statuses: ['SCHEDULED'], title: 'Rendez-vous fixé', icon: 'calendar' },
  { statuses: ['IN_PROGRESS'], title: 'Intervention en cours', icon: 'wrench' },
  { statuses: ['COMPLETED'], title: 'Intervention terminée', icon: 'check-circle' },
  { statuses: ['CONFIRMED'], title: 'Confirmée', icon: 'shield-check' },
];

export function DemandeProgress({ status }: { status: string }) {
  const currentIndex = PROGRESS_STEPS.findIndex((step) => step.statuses.includes(status));
  if (currentIndex === -1) return null;

  const steps: TimelineStep[] = PROGRESS_STEPS.map((step, index) => ({
    id: step.title,
    title: step.title,
    icon: step.icon,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending',
  }));

  return <Timeline steps={steps} />;
}