'use client';

import { usePush } from './push-context';

/* Hook principal push (réexport du contexte). L'abonnement se fait
 * uniquement sur clic explicite — jamais au montage. */
export function usePushState() {
  return usePush();
}

export { usePush };
