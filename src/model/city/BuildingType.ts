import { ResourceType } from '../map/ResourceType';
import { HexType } from '../map/HexType';
import { localize } from '../../i18n';

/**
 * Types de bâtiments constructibles dans les villes.
 */
export enum BuildingType {
  /** Hôtel de ville - Permet l'amélioration de la ville */
  TownHall = 'TownHall',
  /** Marché - Permet le commerce (4:1) */
  Market = 'Market',
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
  /** Port maritime - Permet le commerce maritime (3:1), nécessite de l'eau. Disponible au niveau Ville (2). Niveau 4 débloque l'action Prestige. */
  Seaport = 'Seaport',
  /** Entrepôt - Augmente la capacité de stockage des ressources */
  Warehouse = 'Warehouse',
  /** Forge - Améliore la production de minerai et permet la création d'outils */
  Forge = 'Forge',
  /** Bibliothèque - Augmente la production de connaissances et permet des améliorations */
  Library = 'Library',
  /** Temple - Ajoute des points de civilisation */
  Temple = 'Temple',
  /** Guilde des batisseurs - Permet l'automatisation de constructions. Disponible au niveau Capitale (4). */
  BuildersGuild = 'BuildersGuild',
}

/**
 * Retourne le nom localisé d'un type de bâtiment au moment de l'affichage.
 * Cela garantit que le nom suit la locale courante (après changement de langue).
 */
export function getBuildingTypeName(buildingType: BuildingType): string {
  switch (buildingType) {
    case BuildingType.Seaport:
      return localize('building.seaport');
    case BuildingType.Market:
      return localize('building.market');
    case BuildingType.TownHall:
      return localize('building.townHall');
    case BuildingType.Sawmill:
      return localize('building.sawmill');
    case BuildingType.Brickworks:
      return localize('building.brickworks');
    case BuildingType.Mill:
      return localize('building.mill');
    case BuildingType.Sheepfold:
      return localize('building.sheepfold');
    case BuildingType.Mine:
      return localize('building.mine');
    case BuildingType.Warehouse:
      return localize('building.warehouse');
    case BuildingType.Forge:
      return localize('building.forge');
    case BuildingType.Library:
      return localize('building.library');
    case BuildingType.Temple:
      return localize('building.temple');
    case BuildingType.BuildersGuild:
      return localize('building.buildersGuild');
    default:
      return String(buildingType);
  }
}

/**
 * Coûts de construction des bâtiments.
 */
export const BUILDING_COSTS: Record<BuildingType, Map<ResourceType, number>> = {
  [BuildingType.Seaport]: new Map([
    [ResourceType.Ore, 10],
    [ResourceType.Wood, 15],
    [ResourceType.Brick, 10],
  ]),
  [BuildingType.Market]: new Map([
    [ResourceType.Wood, 5],
  ]),
  [BuildingType.TownHall]: new Map([
    [ResourceType.Wood, 5],
    [ResourceType.Brick, 5],
    [ResourceType.Ore, 1],
  ]),
  [BuildingType.Sawmill]: new Map([
    [ResourceType.Wood, 3],
    [ResourceType.Brick, 4],
  ]),
  [BuildingType.Brickworks]: new Map([
    [ResourceType.Ore, 1],
    [ResourceType.Brick, 5],
  ]),
  [BuildingType.Mill]: new Map([
    [ResourceType.Wood, 2],
    [ResourceType.Brick, 5],
  ]),
  [BuildingType.Sheepfold]: new Map([
    [ResourceType.Wood, 5],
    [ResourceType.Brick, 2],
  ]),
  [BuildingType.Mine]: new Map([
    [ResourceType.Wood, 3],
    [ResourceType.Ore, 2],
  ]),
  [BuildingType.Warehouse]: new Map([
    [ResourceType.Wood, 10],
    [ResourceType.Brick, 10],
  ]),
  [BuildingType.Forge]: new Map([
    [ResourceType.Wood, 5],
    [ResourceType.Brick, 12],
    [ResourceType.Ore, 5],
  ]),
  [BuildingType.Library]: new Map([
    [ResourceType.Wood, 6],
    [ResourceType.Brick, 4],
    [ResourceType.Sheep, 6],
  ]),
  [BuildingType.Temple]: new Map([
    [ResourceType.Wood, 8],
    [ResourceType.Brick, 10],
    [ResourceType.Ore, 3],
  ]),
  [BuildingType.BuildersGuild]: new Map([
    [ResourceType.Wood, 15],
    [ResourceType.Brick, 15],
    [ResourceType.Ore, 10],
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
 * Coûts d'amélioration des bâtiments (par niveau).
 * Le coût est multiplié par le niveau actuel pour obtenir le coût d'amélioration au niveau suivant.
 */
export const BUILDING_UPGRADE_COSTS: Record<BuildingType, Map<ResourceType, number>> = {
  [BuildingType.Seaport]: new Map([
    [ResourceType.Ore, 12],
    [ResourceType.Wood, 16],
    [ResourceType.Brick, 12],
    [ResourceType.Sheep, 4],
  ]),
  [BuildingType.Market]: new Map([
    [ResourceType.Wood, 4],
    [ResourceType.Brick, 2],
  ]),
  [BuildingType.TownHall]: new Map([
    [ResourceType.Wood, 4],
    [ResourceType.Brick, 4],
    [ResourceType.Ore, 2],
  ]),
  [BuildingType.Sawmill]: new Map([
    [ResourceType.Wood, 2],
    [ResourceType.Brick, 3],
  ]),
  [BuildingType.Brickworks]: new Map([
    [ResourceType.Ore, 1],
    [ResourceType.Brick, 4],
  ]),
  [BuildingType.Mill]: new Map([
    [ResourceType.Wood, 2],
    [ResourceType.Brick, 4],
  ]),
  [BuildingType.Sheepfold]: new Map([
    [ResourceType.Wood, 4],
    [ResourceType.Brick, 2],
  ]),
  [BuildingType.Mine]: new Map([
    [ResourceType.Wood, 2],
    [ResourceType.Ore, 2],
  ]),
  [BuildingType.Warehouse]: new Map([
    [ResourceType.Wood, 8],
    [ResourceType.Brick, 8],
  ]),
  [BuildingType.Forge]: new Map([
    [ResourceType.Wood, 4],
    [ResourceType.Brick, 10],
    [ResourceType.Ore, 4],
  ]),
  [BuildingType.Library]: new Map([
    [ResourceType.Wood, 5],
    [ResourceType.Brick, 3],
    [ResourceType.Sheep, 5],
  ]),
  [BuildingType.Temple]: new Map([
    [ResourceType.Wood, 6],
    [ResourceType.Brick, 8],
    [ResourceType.Ore, 2],
  ]),
  [BuildingType.BuildersGuild]: new Map([
    [ResourceType.Wood, 12],
    [ResourceType.Brick, 12],
    [ResourceType.Ore, 8],
  ]),
};

/**
 * Retourne le coût d'amélioration d'un bâtiment pour passer au niveau suivant.
 * Le coût de base est multiplié par le niveau actuel.
 * @param buildingType - Le type de bâtiment
 * @param currentLevel - Le niveau actuel du bâtiment (1 = niveau de base)
 * @returns Le coût sous forme de Map
 */
export function getBuildingUpgradeCost(buildingType: BuildingType, currentLevel: number): Map<ResourceType, number> {
  const baseCost = BUILDING_UPGRADE_COSTS[buildingType];
  const result = new Map<ResourceType, number>();
  for (const [resource, cost] of baseCost) {
    result.set(resource, cost * currentLevel);
  }
  return result;
}

/**
 * Retourne le nom d'un type de bâtiment en français.
 * @param buildingType - Le type de bâtiment
 * @returns Le nom en français
 */
// getBuildingTypeName is defined above and returns the localized string at runtime.

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
  [BuildingType.Seaport]: HexType.Water, // Nécessite de l'eau adjacente
  [BuildingType.Market]: null, // Pas de contrainte d'hex
  [BuildingType.TownHall]: null, // Pas de contrainte d'hex
  [BuildingType.Warehouse]: null, // Pas de contrainte d'hex
  [BuildingType.Forge]: null, // Pas de contrainte d'hex (mais nécessite une Mine pour être utile)
  [BuildingType.Library]: null, // Pas de contrainte d'hex
  [BuildingType.Temple]: null, // Pas de contrainte d'hex
  [BuildingType.BuildersGuild]: null, // Pas de contrainte d'hex
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
  /** Spécialisation - Débloqué par le port maritime niveau 2 */
  Specialization = 'Specialization',
  /** Auto - Commerce automatique - Débloqué par le port maritime niveau 3 */
  Auto = 'Auto',
  /** Prestige - Action spéciale du port maritime niveau 4 */
  Prestige = 'Prestige',
  /** Automatisation - Débloqué par la Guilde des batisseurs */
  Automation = 'Automation',
}

/**
 * Retourne l'action associée à un bâtiment, ou null si aucune action.
 * @param buildingType - Le type de bâtiment
 * @returns L'action associée, ou null
 */
export function getBuildingAction(buildingType: BuildingType): BuildingAction | null {
  switch (buildingType) {
    case BuildingType.TownHall:
      return BuildingAction.Upgrade;
    case BuildingType.BuildersGuild:
      return BuildingAction.Automation;
    default:
      return null;
  }
}

/**
 * Retourne le nom localisé d'une action de bâtiment au runtime.
 */
export function getBuildingActionName(action: BuildingAction): string {
  switch (action) {
    case BuildingAction.Trade:
      return localize('buildingAction.trade');
    case BuildingAction.Upgrade:
      return localize('buildingAction.upgrade');
    case BuildingAction.Specialization:
      return localize('buildingAction.specialization');
    case BuildingAction.Auto:
      return localize('buildingAction.auto');
    case BuildingAction.Prestige:
      return localize('buildingAction.prestige');
    case BuildingAction.Automation:
      return localize('buildingAction.automation');
    default:
      return String(action);
  }
}
