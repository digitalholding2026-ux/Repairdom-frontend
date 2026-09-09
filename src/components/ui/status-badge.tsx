import { Badge } from './badge';
import { demandeStatusConfig, quoteStatusConfig } from '@/lib/request-status';

export interface DemandeStatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function DemandeStatusBadge({ status, className }: DemandeStatusBadgeProps) {
  const config = demandeStatusConfig(status);
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export interface QuoteStatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function QuoteStatusBadge({ status, className }: QuoteStatusBadgeProps) {
  const config = quoteStatusConfig(status);
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}