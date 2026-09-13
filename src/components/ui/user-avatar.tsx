'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { Avatar } from '@/components/ui/avatar';

export interface UserAvatarProps {
  href: string;
}

/** Avatar à initiales (ou photo) cliquable menant au profil. */
export function UserAvatar({ href }: UserAvatarProps) {
  const { user } = useAuth();

  return (
    <Link
      href={href}
      aria-label="Mon profil"
      className="transition-transform hover:scale-105 active:scale-95"
    >
      <Avatar
        src={user?.avatarUrl}
        firstName={user?.firstName}
        lastName={user?.lastName}
        size="sm"
        alt="Avatar du profil"
      />
    </Link>
  );
}