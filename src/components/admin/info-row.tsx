import type { ReactNode } from 'react';

export interface AdminInfoRowProps {
  label: string;
  value: ReactNode;
}

export function AdminInfoRow({ label, value }: AdminInfoRowProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value}</p>
    </div>
  );
}