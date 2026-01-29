import { ResourceType } from '../map/ResourceType';
import { HexType } from '../map/HexType';
import { localize } from '../../i18n';
import { SawmillSpec } from './building/Sawmill';
import { BrickworksSpec } from './building/Brickworks';
import { MillSpec } from './building/Mill';
import { SheepfoldSpec } from './building/Sheepfold';
import { MineSpec } from './building/Mine';
import { SeaportSpec } from './building/Seaport';
import { MarketSpec } from './building/Market';
import { TownHallSpec } from './building/TownHall';
import { WarehouseSpec } from './building/Warehouse';
import { ForgeSpec } from './building/Forge';
import { LibrarySpec } from './building/Library';
import { TempleSpec } from './building/Temple';
import { BuildersGuildSpec } from './building/BuildersGuild';

function getFactory(): any {
  return function createBuildingSpec(buildingType: string) {
    switch (buildingType) {
      case 'Sawmill': return new SawmillSpec();
      case 'Brickworks': return new BrickworksSpec();
      case 'Mill': return new MillSpec();
      case 'Sheepfold': return new SheepfoldSpec();
      case 'Mine': return new MineSpec();
      case 'Seaport': return new SeaportSpec();
      case 'Market': return new MarketSpec();
      case 'TownHall': return new TownHallSpec();
      case 'Warehouse': return new WarehouseSpec();
      case 'Forge': return new ForgeSpec();
      case 'Library': return new LibrarySpec();
      case 'Temple': return new TempleSpec();
      case 'BuildersGuild': return new BuildersGuildSpec();
      default:
        return new (class {
          getBuildCost() { return new Map(); }
          getUpgradeCost(_: number) { return new Map(); }
          getName(s: string) { return String(s); }
          getRequiredHexType() { return null; }
          getAction() { return null; }
          getActionName(a: string) { return String(a); }
          getDescription(s: string) { return String(s); }
        })();
    }
  };
}

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
  const factory = getFactory();
  if (!factory) throw new Error('createBuildingSpec factory unavailable');
  const spec = factory(buildingType as unknown as string);
  return spec.getName(buildingType as unknown as string);
}

/**
 * Coûts de construction des bâtiments.
 */
/**
 * Retourne le coût de construction d'un bâtiment en délégant
 * à la classe spécification du bâtiment.
 */
export function getBuildingCost(buildingType: BuildingType): Map<ResourceType, number> {
  const factory = getFactory();
  if (!factory) throw new Error('createBuildingSpec factory unavailable');
  const spec = factory(buildingType as unknown as string);
  return spec.getBuildCost();
}

/**
 * Coûts d'amélioration des bâtiments (par niveau).
 * Le coût est multiplié par le niveau actuel pour obtenir le coût d'amélioration au niveau suivant.
 */
/**
 * Retourne le coût d'amélioration d'un bâtiment pour passer au niveau suivant
 * en délégant à la spécification de bâtiment.
 */
export function getBuildingUpgradeCost(buildingType: BuildingType, currentLevel: number): Map<ResourceType, number> {
  const factory = getFactory();
  if (!factory) throw new Error('createBuildingSpec factory unavailable');
  const spec = factory(buildingType as unknown as string);
  return spec.getUpgradeCost(currentLevel);
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
  const factory = getFactory();
  if (!factory) throw new Error('createBuildingSpec factory unavailable');
  const spec = factory(buildingType as unknown as string);
  return spec.getRequiredHexType(buildingType as unknown as string);
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
  const factory = getFactory();
  if (!factory) throw new Error('createBuildingSpec factory unavailable');
  const spec = factory(buildingType as unknown as string);
  const actionStr = spec.getAction(buildingType as unknown as string);
  return actionStr ? (actionStr as unknown as BuildingAction) : null;
}

/**
 * Retourne le nom localisé d'une action de bâtiment au runtime.
 */
export function getBuildingActionName(action: BuildingAction): string {
  const factory = getFactory();
  if (!factory) throw new Error('createBuildingSpec factory unavailable');
  const spec = factory('');
  return spec.getActionName(action as unknown as string);
}

/**
 * Retourne une description localisée d'un bâtiment (utilisée pour les tooltips).
 */
export function getBuildingDescription(buildingType: BuildingType): string {
  const factory = getFactory();
  if (!factory) throw new Error('createBuildingSpec factory unavailable');
  const spec = factory(buildingType as unknown as string);
  return spec.getDescription(buildingType as unknown as string);
}
