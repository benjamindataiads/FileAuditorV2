export interface FieldMapping {
  en: string;
  fr: string;
}

export const fieldMappings: Record<string, FieldMapping> = {
  id: { en: "id", fr: "Identifiant" },
  title: { en: "title", fr: "Titre" },
  description: { en: "description", fr: "Description" },
  link: { en: "link", fr: "Lien" },
  image_link: { en: "image_link", fr: "Lien image" },
  additional_image_link: { en: "additional_image_link", fr: "Lien image supplémentaire" },
  availability: { en: "availability", fr: "Disponibilité" },
  price: { en: "price", fr: "Prix" },
  brand: { en: "brand", fr: "Marque" },
  gtin: { en: "gtin", fr: "GTIN" },
  mpn: { en: "mpn", fr: "MPN" },
  google_product_category: { en: "google_product_category", fr: "Catégorie de produit Google" },
  product_type: { en: "product_type", fr: "Type de produit" },
  condition: { en: "condition", fr: "État" },
  item_group_id: { en: "item_group_id", fr: "Identifiant de groupe d'articles" },
  custom_label_0: { en: "custom_label_0", fr: "Étiquette personnalisée 0" },
  custom_label_1: { en: "custom_label_1", fr: "Étiquette personnalisée 1" },
  custom_label_2: { en: "custom_label_2", fr: "Étiquette personnalisée 2" },
  custom_label_3: { en: "custom_label_3", fr: "Étiquette personnalisée 3" },
  custom_label_4: { en: "custom_label_4", fr: "Étiquette personnalisée 4" },
  mobile_link: { en: "mobile_link", fr: "URL mobile" },
  multipack: { en: "multipack", fr: "Multipack" },
  is_bundle: { en: "is_bundle", fr: "Lot" },
  availability_date: { en: "availability_date", fr: "Date de disponibilité" },
  expiration_date: { en: "expiration_date", fr: "Date d'expiration" },
  unit_pricing_measure: { en: "unit_pricing_measure", fr: "Unité de prix" },
  unit_pricing_base_measure: { en: "unit_pricing_base_measure", fr: "Base de l'unité de prix" },
  min_handling_time: { en: "min_handling_time", fr: "Quantité minimale de commande" },
  max_handling_time: { en: "max_handling_time", fr: "Quantité maximale de commande" },
  shipping: { en: "shipping", fr: "Frais d'expédition" },
  shipping_weight: { en: "shipping_weight", fr: "Poids du colis" },
  shipping_length: { en: "shipping_length", fr: "Longueur du colis" },
  shipping_width: { en: "shipping_width", fr: "Largeur du colis" },
  shipping_height: { en: "shipping_height", fr: "Hauteur du colis" },
  shipping_label: { en: "shipping_label", fr: "Pays d'origine" },
  tax: { en: "tax", fr: "Taxe" },
  identifier_exists: { en: "identifier_exists", fr: "Code produit unique" },
  color: { en: "color", fr: "Couleur" },
  size: { en: "size", fr: "Taille" },
  pattern: { en: "pattern", fr: "Motif" },
  material: { en: "material", fr: "Matière" },
  age_group: { en: "age_group", fr: "Groupe cible" },
  gender: { en: "gender", fr: "Sexe" },
  size_system: { en: "size_system", fr: "Taille du système" },
  size_type: { en: "size_type", fr: "Type de taille" },
  product_highlight: { en: "product_highlight", fr: "Point fort du produit" }
};

// Get all available field names (English only for UI)
export const getFieldNames = (): string[] => {
  return Object.keys(fieldMappings);
};

// Get French translation for an English field name
export const getFrenchFieldName = (englishName: string): string => {
  const mapping = fieldMappings[englishName as keyof typeof fieldMappings];
  return mapping ? mapping.fr : englishName;
};

// Get English name for a French field name
export const getEnglishFieldName = (frenchName: string): string | undefined => {
  const entry = Object.entries(fieldMappings).find(([_, mapping]) => mapping.fr === frenchName);
  return entry ? entry[0] : undefined;
};

// Validate field name in either language and return English version
export const validateAndNormalizeFieldName = (fieldName: string): string | undefined => {
  // If it's already an English field name
  if (fieldMappings[fieldName as keyof typeof fieldMappings]) {
    return fieldName;
  }
  
  // If it's a French field name, get its English equivalent
  return getEnglishFieldName(fieldName);
};
