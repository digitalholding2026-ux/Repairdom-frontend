'use client';

import { VerificationPanel } from '@/components/auth/verification-panel';
import { BrandLogo } from '@/components/public/brand-logo';

export default function VerificationPage() {
  return (
    /* Le header global est masqué sur cette route (cf. `layout.tsx`) : ce
     * logo centré est donc le SEUL de la page. */
    <div className="flex flex-col items-center py-8">
      <div className="mb-6 flex justify-center">
        <BrandLogo href="/" />
      </div>
      <div className="w-full">
        <VerificationPanel role="CLIENT" />
      </div>
    </div>
  );
}
