import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <Spinner size="lg" className="text-primary" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}