'use client';

import { VerificationPanel } from '@/components/auth/verification-panel';
import { BrandLogo } from '@/components/public/brand-logo';

export default function VerificationPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-center pt-2">
        <BrandLogo href="/" />
      </div>
      <VerificationPanel role="CLIENT" />
    </div>
  );
}
