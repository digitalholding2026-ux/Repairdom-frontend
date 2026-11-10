import { redirect } from 'next/navigation';

/* Redirection de sécurité : l'onglet "Chronologies" (V1) a été supprimé.
 * Les anciens liens en favori aboutissent ici et sont renvoyés vers
 * "Mes demandes", qui couvre désormais le même périmètre en V2. */
export default async function ChronologiesRedirect() {
  redirect('/client/demandes');
}
