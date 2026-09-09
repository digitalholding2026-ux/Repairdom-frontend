import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';

export interface AuthCardProps {
  icon: IconName;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}

export function AuthCard({ icon, title, description, children }: AuthCardProps) {
  return (
    <Card>
      <CardHeader>
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name={icon} size="lg" />
        </span>
        <div className="mt-1">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}