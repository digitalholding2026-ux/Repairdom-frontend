export interface CatalogQuoteParts {
  diagnostic: string;
  intervention: string;
}

export function parseCatalogQuoteDescription(
  description: string,
): CatalogQuoteParts | null {
  const prefix = 'Tarif RepairDom — ';
  if (!description.startsWith(prefix)) return null;
  const rest = description.slice(prefix.length);
  const openIdx = rest.lastIndexOf(' (');
  if (openIdx <= 0 || !rest.endsWith(')')) return null;
  return {
    intervention: rest.slice(0, openIdx).trim(),
    diagnostic: rest.slice(openIdx + 2, rest.length - 1).trim(),
  };
}