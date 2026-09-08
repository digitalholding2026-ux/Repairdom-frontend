import type { Metadata } from 'next';
import { ClientDashboard } from '@/components/client/client-dashboard';

export const metadata: Metadata = {
  title: 'Espace client',
};

export default function ClientHomePage() {
  return <ClientDashboard />;
}