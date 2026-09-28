'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createIdempotencyKey } from './idempotency-key';

/* CHANTIER PAIEMENT P0/P1 — clé d'idempotence stable par tentative.
 *
 * - Aucun setState pendant le render (la régénération passe par useEffect).
 * - Même `signature` (montant|réseau|téléphone) → même clé (retry sûr,
 *   le backend rejoue la même intention au lieu de créer un doublon).
 * - Signature différente → nouvelle clé.
 * - `renew()` : nouvelle tentative EXPLICITE avec contenu identique
 *   (ex. après un SUCCESS, pour ne pas rejouer l'ancienne intention —
 *   le backend retourne l'existant pour une clé déjà consommée). */
export function useStableIdempotencyKey(signature: string): {
  key: string;
  renew: () => void;
} {
  const [key, setKey] = useState(() => createIdempotencyKey());
  const lastSignature = useRef(signature);

  useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      setKey(createIdempotencyKey());
    }
  }, [signature]);

  const renew = useCallback(() => {
    setKey(createIdempotencyKey());
  }, []);

  return { key, renew };
}
