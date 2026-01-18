import { ResourceType } from '../map/ResourceType';
import { HexType } from '../map/HexType';

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

/**
 * Mapping des bâtiments de production de ressources vers le type d'hex requis.
 * Un bâtiment ne peut être construit que si la ville a au moins un hex adjacent du type requis.
 */
export const BUILDING_REQUIRED_HEX_TYPE: Record<BuildingType, HexType | null> = {
  [BuildingType.Sawmill]: HexType.Wood,
  [BuildingType.Brickworks]: HexType.Brick,
  [BuildingType.Mill]: HexType.Wheat,
  [BuildingType.Sheepfold]: HexType.Sheep,
  [BuildingType.Mine]: HexType.Ore,
  [BuildingType.Seaport]: null, // Pas de contrainte d'hex
  [BuildingType.TownHall]: null, // Pas de contrainte d'hex
};

/**
 * Retourne le type d'hex requis pour construire un bâtiment, ou null si aucun requis.
 * @param buildingType - Le type de bâtiment
 * @returns Le type d'hex requis, ou null si aucun
 */
export function getRequiredHexType(buildingType: BuildingType): HexType | null {
  return BUILDING_REQUIRED_HEX_TYPE[buildingType] ?? null;
}

/**
 * Actions associées aux bâtiments.
 */
export enum BuildingAction {
  /** Commerce - Débloqué par le port maritime */
  Trade = 'Trade',
  /** Améliorer - Débloqué par l'hôtel de ville */
  Upgrade = 'Upgrade',
}

/**
 * Retourne l'action associée à un bâtiment, ou null si aucune action.
 * @param buildingType - Le type de bâtiment
 * @returns L'action associée, ou null
 */
export function getBuildingAction(buildingType: BuildingType): BuildingAction | null {
  switch (buildingType) {
    case BuildingType.Seaport:
      return BuildingAction.Trade;
    case BuildingType.TownHall:
      return BuildingAction.Upgrade;
    default:
      return null;
  }
}

/**
 * Noms des actions en français.
 */
export const BUILDING_ACTION_NAMES: Record<BuildingAction, string> = {
  [BuildingAction.Trade]: 'Commerce',
  [BuildingAction.Upgrade]: 'Améliorer',
};
