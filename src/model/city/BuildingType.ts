/**
 * Types de bâtiments constructibles dans les villes.
 */
export enum BuildingType {
  /** Hôtel de ville - Permet l'amélioration de la ville */
  CityHall = 'CityHall',
  /** Entrepôt - Augmente la capacité de stockage */
  Warehouse = 'Warehouse',
  /** Marché - Permet le commerce */
  Market = 'Market',
  /** Forge - Produit des outils */
  Forge = 'Forge',
  /** Ferme - Produit de la nourriture */
  Farm = 'Farm',
  /** Scierie - Produit du bois */
  Sawmill = 'Sawmill',
  /** Carrière - Produit de la pierre */
  Quarry = 'Quarry',
  /** Caserne - Permet de recruter des unités */
  Barracks = 'Barracks',
}

/**
 * Noms des bâtiments en français.
 */
export const BUILDING_TYPE_NAMES: Record<BuildingType, string> = {
  [BuildingType.CityHall]: 'Hôtel de ville',
  [BuildingType.Warehouse]: 'Entrepôt',
  [BuildingType.Market]: 'Marché',
  [BuildingType.Forge]: 'Forge',
  [BuildingType.Farm]: 'Ferme',
  [BuildingType.Sawmill]: 'Scierie',
  [BuildingType.Quarry]: 'Carrière',
  [BuildingType.Barracks]: 'Caserne',
};

/**
 * Retourne le nom d'un type de bâtiment en français.
 * @param buildingType - Le type de bâtiment
 * @returns Le nom en français
 */
export function getBuildingTypeName(buildingType: BuildingType): string {
  return BUILDING_TYPE_NAMES[buildingType];
}

/**
 * Retourne tous les types de bâtiments disponibles.
 * @returns Un tableau de tous les types de bâtiments
 */
export function getAllBuildingTypes(): BuildingType[] {
  return Object.values(BuildingType);
}
