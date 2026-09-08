export interface RequestCategory {
  id: string;
  label: string;
  description?: string;
}

// Liste extensible : ajouter une entrée ici suffit pour faire apparaître
// une nouvelle catégorie dans le parcours client.
export const REQUEST_CATEGORIES: RequestCategory[] = [
  {
    id: 'electricite',
    label: 'Électricité',
    description: 'Panne de courant, prises, interrupteurs…',
  },
  {
    id: 'plomberie',
    label: 'Plomberie',
    description: 'Fuite, robinet, chauffe-eau…',
  },
  {
    id: 'climatisation',
    label: 'Climatisation',
    description: 'Installer, réparer, entretenir…',
  },
  {
    id: 'electromenager',
    label: 'Électroménager',
    description: 'Lave-linge, four, réfrigérateur…',
  },
  {
    id: 'serrurerie',
    label: 'Serrurerie',
    description: 'Porte bloquée, serrure à changer…',
  },
  {
    id: 'informatique',
    label: 'Informatique',
    description: 'Ordinateur, box internet, TV…',
  },
  {
    id: 'autre',
    label: 'Autre',
    description: 'Un autre besoin de dépannage',
  },
];