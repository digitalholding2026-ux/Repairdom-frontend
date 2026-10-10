import { formatFCFA } from '@/lib/format-fcfa';

/* Lignes de détail d'un devis — communes au client et au technicien.
 *
 * POURQUOI SEULE LA PRÉSENTATION EST PARTAGÉE
 * Le CALCUL du total, lui, reste à l'appelant, et c'est délibéré.
 *
 * Les deux écrans ne tombaient pas sur la même formule de repli :
 *   client     : amount + travel
 *   technicien : (repair ?? amount) + travel
 * Sur un devis ancien, privé du champ `totalToDebit`, les deux affiche donc
 * des montants DIFFÉRENTS pour le même devis. Corriger l'un des deux
 * corrigerait un montant affiché sans que personne n'ait tranché lequel des
 * deux est le bon — la décision ne relève pas de ce composant.
 *
 * En calculant au point d'appel, la divergence reste visible là où elle se
 * produit, et un test peut encore la voir. Un composant qui calculerait
 * lui-même l'aurait cachée sous une abstraction, et l'aurait rendue
 * invisible.
 *
 * Les libellés de la ligne de total DIFFÈRENT — l'un parle au client de ce
 * qu'il doit, l'autre dit au technicien ce que son client va débiter. Ce
 * n'est pas le même mot, donc pas le même composant figé : c'est une prop.
 */

/** Éléments du devis affichés en lignes. */
export interface QuoteLinesInput {
  /** Nom du diagnostic catalogue, s'il y en a un. */
  diagnosticName?: string | null;
  /** Nom de l'intervention catalogue, s'il y en a une. */
  interventionName?: string | null;
  /** Montant de la réparation — avec repli sur le prix de référence. */
  repair: number | null;
  /** Montant du déplacement — avec repli sur le tarif catalogue. */
  travel: number | null;
  /**
   * Total déjà calculé par l'appelant, SAUF s'il applique une formule de
   * repli différente de celle de l'écran. Passé séparément pour que
   * l'appelant garde la main sur cette formule.
   */
  total: number | null;
  /** Libellé de la ligne de total — diffère selon l'écran. */
  totalLabel: string;
  /**
   * Phrase sous le total : ce que représente cette somme, pour qui.
   * Vide côté technicien — qui affiche ses propres lignes de commission et de
   * net juste en dessous, avec leur propre explication.
   */
  totalNote?: string;
  /**
   * Balise de la cellule de libellé.
   *
   * Le client rend ce bloc dans une liste de définitions (`dl` → `dt`/`dd`),
   * le technicien dans une grille de `div`. Les deux choix sont corrects dans
   * leur contexte : `dt`/`dd` porte du sens là où la liste EST une liste de
   * définitions, `span` ne le perd pas là où elle ne l'est pas.
   *
   * figé par défaut sur `span` — l'écran qui perdrait de la sémantique est
   * celui qui oublie de passer `dt`.
   */
  labelTag?: 'dt' | 'span';
  /** Balise de la cellule de valeur — suit `labelTag`. */
  valueTag?: 'dd' | 'span';
}

export function QuoteLines({
  diagnosticName,
  interventionName,
  repair,
  travel,
  total,
  totalLabel,
  totalNote,
  labelTag: Label = 'span',
  valueTag: Value = 'span',
}: QuoteLinesInput) {
  return (
    <>
      {diagnosticName ? (
        <div className="flex items-center justify-between gap-3">
          <Label className="text-muted-foreground">Diagnostic</Label>
          <Value className="text-right font-medium">{diagnosticName}</Value>
        </div>
      ) : null}
      {interventionName ? (
        <div className="flex items-center justify-between gap-3">
          <Label className="text-muted-foreground">Intervention</Label>
          <Value className="text-right font-medium">{interventionName}</Value>
        </div>
      ) : null}
      {(diagnosticName || interventionName) ? (
        <div className="my-1 h-px bg-border" aria-hidden />
      ) : null}
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground">Réparation</Label>
        <Value className="font-medium">{formatFCFA(repair)}</Value>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground">Déplacement</Label>
        <Value className="font-medium">{formatFCFA(travel)}</Value>
      </div>
      <div className="my-1 h-px bg-border" aria-hidden />
      <div className="flex items-center justify-between">
        <Label className="font-semibold">{totalLabel}</Label>
        <Value className="font-semibold tabular-nums">{formatFCFA(total)}</Value>
      </div>
      {totalNote ? (
        <p className="mt-1 text-xs text-muted-foreground">{totalNote}</p>
      ) : null}
    </>
  );
}