import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface MarqueeProps {
  items: ReactNode[];
  className?: string;
  itemClassName?: string;
  reverse?: boolean;
  duration?: number;
  style?: CSSProperties;
}

export function Marquee({
  items,
  className,
  itemClassName,
  reverse = false,
  duration = 30,
  style,
}: MarqueeProps) {
  const doubled = [...items, ...items];
  return (
    <div
      style={{ ...style, '--marquee-duration': `${duration}s` } as CSSProperties}
      className={cn('marquee-pause overflow-hidden', className)}
    >
      <div className={cn('marquee-track flex w-max gap-3 pr-3', reverse && 'marquee-reverse')}>
        {doubled.map((item, index) => (
          <div key={index} className={cn('shrink-0', itemClassName)}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}