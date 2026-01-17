import { ResourceType } from '../map/ResourceType';

/**
 * Types de bâtiments constructibles dans les villes.
 */
export enum BuildingType {
  /** Port maritime - Permet le commerce maritime */
  Seaport = 'Seaport',
  /** Hôtel de ville - Permet l'amélioration de la ville */
  TownHall = 'TownHall',
  /** Scierie - Produit du bois */
  Sawmill = 'Sawmill',
  /** Briqueterie - Produit de la brique */
  Brickworks = 'Brickworks',
  /** Moulin - Produit du blé */
  Mill = 'Mill',
  /** Bergerie - Produit du mouton */
  Sheepfold = 'Sheepfold',
  /** Mine - Produit du minerai */
  Mine = 'Mine',
}

/**
 * Noms des bâtiments en français.
 */
export const BUILDING_TYPE_NAMES: Record<BuildingType, string> = {
  [BuildingType.Seaport]: 'Port maritime',
  [BuildingType.TownHall]: 'Hôtel de ville',
  [BuildingType.Sawmill]: 'Scierie',
  [BuildingType.Brickworks]: 'Briqueterie',
  [BuildingType.Mill]: 'Moulin',
  [BuildingType.Sheepfold]: 'Bergerie',
  [BuildingType.Mine]: 'Mine',
};

/**
 * Coûts de construction des bâtiments.
 */
export const BUILDING_COSTS: Record<BuildingType, Map<ResourceType, number>> = {
  [BuildingType.Seaport]: new Map([
    [ResourceType.Wood, 5],
  ]),
  [BuildingType.TownHall]: new Map([
    [ResourceType.Wood, 5],
    [ResourceType.Brick, 5],
    [ResourceType.Ore, 1],
  ]),
  [BuildingType.Sawmill]: new Map([
    [ResourceType.Wood, 3],
    [ResourceType.Brick, 2],
  ]),
  [BuildingType.Brickworks]: new Map([
    [ResourceType.Wood, 3],
    [ResourceType.Brick, 2],
  ]),
  [BuildingType.Mill]: new Map([
    [ResourceType.Wood, 3],
    [ResourceType.Brick, 2],
  ]),
  [BuildingType.Sheepfold]: new Map([
    [ResourceType.Wood, 3],
    [ResourceType.Brick, 2],
  ]),
  [BuildingType.Mine]: new Map([
    [ResourceType.Wood, 3],
    [ResourceType.Brick, 2],
  ]),
};

/**
 * Retourne le coût de construction d'un bâtiment.
 * @param buildingType - Le type de bâtiment
 * @returns Le coût sous forme de Map
 */
export function getBuildingCost(buildingType: BuildingType): Map<ResourceType, number> {
  return new Map(BUILDING_COSTS[buildingType]);
}

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

/**
 * Retourne les bâtiments de production de ressources (niveau 1).
 * @returns Un tableau des types de bâtiments de production
 */
export function getResourceProductionBuildings(): BuildingType[] {
  return [
    BuildingType.Sawmill,
    BuildingType.Brickworks,
    BuildingType.Mill,
    BuildingType.Sheepfold,
    BuildingType.Mine,
  ];
}
