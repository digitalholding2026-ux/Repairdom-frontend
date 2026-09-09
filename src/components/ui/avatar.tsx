import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { Icon } from './icon';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeClasses: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: 'size-8', text: 'text-xs' },
  md: { box: 'size-10', text: 'text-sm' },
  lg: { box: 'size-12', text: 'text-base' },
  xl: { box: 'size-16', text: 'text-xl' },
  '2xl': { box: 'size-20', text: 'text-2xl' },
};

export interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string | null;
  size?: AvatarSize;
  online?: boolean;
  className?: string;
  alt?: string;
}

export function Avatar({
  src,
  firstName,
  lastName,
  size = 'md',
  online = false,
  className,
  alt,
}: AvatarProps) {
  const { box, text } = sizeClasses[size];
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={alt ?? (firstName ? initials(firstName, lastName) : '')}
          loading="lazy"
          className={cn(box, 'rounded-full border border-border object-cover')}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            box,
            'inline-flex items-center justify-center rounded-full border border-border bg-muted font-semibold text-muted-foreground',
            text,
          )}
        >
          {firstName ? initials(firstName, lastName) : <Icon name="user" style={{ width: '50%', height: '50%' }} />}
        </span>
      )}
      {online ? (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-success"
        />
      ) : null}
    </span>
  );
}