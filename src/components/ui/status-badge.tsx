import { Badge } from './badge';
import { demandeStatusConfig, quoteStatusConfig, type StatusContext } from '@/lib/request-status';

export interface DemandeStatusBadgeProps {
  status: string | null | undefined;
  context?: StatusContext;
  className?: string;
}

export function DemandeStatusBadge({ status, context = 'client', className }: DemandeStatusBadgeProps) {
  const config = demandeStatusConfig(status, context);
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