export type RequestTimingMode = 'ASAP' | 'SCHEDULED';

export function formatRequestedTiming(mode: string, requestedAt: string | null): string {
  if (mode !== 'SCHEDULED' || !requestedAt) {
    return 'Dès que possible';
  }
  const date = new Date(requestedAt);
  if (Number.isNaN(date.getTime())) {
    return 'Dès que possible';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()} à ${hours}:${minutes}`;
}