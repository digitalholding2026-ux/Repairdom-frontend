import type { IconName } from '@/components/ui/icon';

export const STATUS_PROGRESS: Record<string, number> = {
  SUBMITTED: 15,
  PENDING: 30,
  ACCEPTED: 50,
  SCHEDULED: 65,
  IN_PROGRESS: 82,
  COMPLETED: 100,
  CONFIRMED: 100,
  CANCELED: 0,
};

export type StepTone = 'indigo' | 'violet' | 'blue' | 'amber' | 'emerald';

export interface MissionStepConfig {
  key: string;
  statuses: string[];
  label: string;
  icon: IconName;
  tone: StepTone;
}

/** Macro-étapes du suivi de mission (stepper + barre de progression). */
export const MISSION_STEPS: MissionStepConfig[] = [
  { key: 'submitted', statuses: ['SUBMITTED', 'PENDING'], label: 'Demande envoyée', icon: 'file', tone: 'indigo' },
  { key: 'accepted', statuses: ['ACCEPTED'], label: 'Technicien trouvé', icon: 'users', tone: 'violet' },
  { key: 'scheduled', statuses: ['SCHEDULED'], label: 'Rendez-vous fixé', icon: 'calendar', tone: 'blue' },
  { key: 'in_progress', statuses: ['IN_PROGRESS'], label: 'Intervention en cours', icon: 'wrench', tone: 'amber' },
  { key: 'completed', statuses: ['COMPLETED', 'CONFIRMED'], label: 'Intervention terminée', icon: 'check-circle', tone: 'emerald' },
];

const CANCELED_STEP: MissionStepConfig = {
  key: 'canceled',
  statuses: ['CANCELED'],
  label: 'Mission annulée',
  icon: 'x',
  tone: 'emerald',
};

export function missionStepsFor(status: string): MissionStepConfig[] {
  if (status === 'CANCELED') return [...MISSION_STEPS, CANCELED_STEP];
  return MISSION_STEPS;
}

export function missionCurrentIndex(status: string): number {
  const steps = missionStepsFor(status);
  const index = steps.findIndex((step) => step.statuses.includes(status));
  return index === -1 ? 0 : index;
}