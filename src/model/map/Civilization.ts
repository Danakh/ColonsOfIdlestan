import { CivilizationId } from './CivilizationId';
import { IslandMap } from './IslandMap';

/**
 * Format sérialisé d'une civilisation.
 */
export interface CivilizationSerialized {
  id: string;
  autoRoadConstruction?: boolean;
  autoOutpostConstruction?: boolean;
  autoCityUpgrade?: boolean;
  autoProductionBuildingConstruction?: boolean;
  resourceGainLevel?: number;
  civPointGainLevel?: number;
  constructionTimeLevel?: number;
}

/**
 * Représente une civilisation dans le jeu.
 * 
 * Entité légère optionnelle qui peut contenir des informations
 * supplémentaires sur une civilisation. L'identifiant seul (CivilizationId)
 * peut suffire dans certains cas.
 */
export class Civilization {
  private _autoRoadConstruction: boolean = false;
  private _autoOutpostConstruction: boolean = false;
  private _autoCityUpgrade: boolean = false;
  private _autoProductionBuildingConstruction: boolean = false;
  private _resourceGainLevel: number = 0; // 0..100
  private _civPointGainLevel: number = 0; // 0..10
  private _constructionTimeLevel: number = 0; // 0..10

  /**
   * Crée une nouvelle civilisation.
   * @param id - L'identifiant unique de la civilisation
   */
  constructor(public readonly id: CivilizationId) {}

  /**
   * Active ou désactive la construction automatique de routes.
   * @param enabled - true pour activer, false pour désactiver
   */
  setAutoRoadConstruction(enabled: boolean): void {
    this._autoRoadConstruction = enabled;
  }

  /**
   * Vérifie si la construction automatique de routes est activée.
   * @returns true si la construction automatique de routes est activée
   */
  isAutoRoadConstructionEnabled(): boolean {
    return this._autoRoadConstruction;
  }

  /**
   * Active ou désactive la construction automatique d'outposts.
   * @param enabled - true pour activer, false pour désactiver
   */
  setAutoOutpostConstruction(enabled: boolean): void {
    this._autoOutpostConstruction = enabled;
  }

  /**
   * Vérifie si la construction automatique d'outposts est activée.
   * @returns true si la construction automatique d'outposts est activée
   */
  isAutoOutpostConstructionEnabled(): boolean {
    return this._autoOutpostConstruction;
  }

  /**
   * Active ou désactive l'amélioration automatique de villes.
   * @param enabled - true pour activer, false pour désactiver
   */
  setAutoCityUpgrade(enabled: boolean): void {
    this._autoCityUpgrade = enabled;
  }

  /**
   * Vérifie si l'amélioration automatique de villes est activée.
   * @returns true si l'amélioration automatique de villes est activée
   */
  isAutoCityUpgradeEnabled(): boolean {
    return this._autoCityUpgrade;
  }

  /**
   * Active ou désactive la construction automatique de bâtiments de production.
   * @param enabled - true pour activer, false pour désactiver
   */
  setAutoProductionBuildingConstruction(enabled: boolean): void {
    this._autoProductionBuildingConstruction = enabled;
  }

  /**
   * Vérifie si la construction automatique de bâtiments de production est activée.
   * @returns true si la construction automatique de bâtiments de production est activée
   */
  isAutoProductionBuildingConstructionEnabled(): boolean {
    return this._autoProductionBuildingConstruction;
  }

  /**
   * Vérifie si cette civilisation est égale à une autre.
   */
  equals(other: Civilization): boolean {
    return this.id.equals(other.id);
  }

  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString(): string {
    return `Civilization(${this.id.toString()})`;
  }

  /**
   * Sérialise la civilisation.
   */
  serialize(): CivilizationSerialized {
    const result: CivilizationSerialized = {
      id: this.id.serialize(),
    };
    if (this._autoRoadConstruction) {
      result.autoRoadConstruction = this._autoRoadConstruction;
    }
    if (this._autoOutpostConstruction) {
      result.autoOutpostConstruction = this._autoOutpostConstruction;
    }
    if (this._autoCityUpgrade) {
      result.autoCityUpgrade = this._autoCityUpgrade;
    }
    if (this._autoProductionBuildingConstruction) {
      result.autoProductionBuildingConstruction = this._autoProductionBuildingConstruction;
    }
    if (this._resourceGainLevel && this._resourceGainLevel > 0) {
      result.resourceGainLevel = this._resourceGainLevel;
    }
    if (this._civPointGainLevel && this._civPointGainLevel > 0) {
      result.civPointGainLevel = this._civPointGainLevel;
    }
    if (this._constructionTimeLevel && this._constructionTimeLevel > 0) {
      result.constructionTimeLevel = this._constructionTimeLevel;
    }
    return result;
  }

  /**
   * Désérialise une civilisation.
   */
  static deserialize(data: CivilizationSerialized): Civilization {
    const civ = new Civilization(CivilizationId.deserialize(data.id));
    if (data.autoRoadConstruction) {
      civ.setAutoRoadConstruction(true);
    }
    if (data.autoOutpostConstruction) {
      civ.setAutoOutpostConstruction(true);
    }
    if (data.autoCityUpgrade) {
      civ.setAutoCityUpgrade(true);
    }
    if (data.autoProductionBuildingConstruction) {
      civ.setAutoProductionBuildingConstruction(true);
    }
    // Upgrades: backwards-compatible defaults
    if (data.resourceGainLevel !== undefined && data.resourceGainLevel !== null) {
      civ._resourceGainLevel = data.resourceGainLevel;
    }
    if (data.civPointGainLevel !== undefined && data.civPointGainLevel !== null) {
      civ._civPointGainLevel = data.civPointGainLevel;
    }
    if (data.constructionTimeLevel !== undefined && data.constructionTimeLevel !== null) {
      civ._constructionTimeLevel = data.constructionTimeLevel;
    }
    return civ;
  }

  /**
   * Retourne le nombre de routes appartenant à cette civilisation sur la carte.
   * @param islandMap - La carte de jeu
   * @returns Le nombre de routes
   */
  getRoadCount(islandMap: IslandMap): number {
    return islandMap.getRoadsForCivilization(this.id).length;
  }

  /**
   * Retourne le nombre de villes appartenant à cette civilisation sur la carte.
   * @param islandMap - La carte de jeu
   * @returns Le nombre de villes
   */
  getCityCount(islandMap: IslandMap): number {
    return islandMap.getCitiesForCivilization(this.id).length;
  }

  /**
   * Retourne la somme des niveaux de toutes les villes de cette civilisation.
   * @param islandMap - La carte de jeu
   * @returns La somme des niveaux de villes
   */
  getTotalCityLevel(islandMap: IslandMap): number {
    const cities = islandMap.getCitiesForCivilization(this.id);
    return cities.reduce((total, city) => total + city.level, 0);
  }

  /**
   * Retourne le nombre total de bâtiments dans toutes les villes de cette civilisation.
   * @param islandMap - La carte de jeu
   * @returns Le nombre total de bâtiments
   */
  getBuildingCount(islandMap: IslandMap): number {
    const cities = islandMap.getCitiesForCivilization(this.id);
    return cities.reduce((total, city) => total + city.getBuildingCount(), 0);
  }

  // --- Civilization upgrades API ---
  getResourceGainLevel(): number {
    return this._resourceGainLevel;
  }

  setResourceGainLevel(level: number): void {
    this._resourceGainLevel = Math.max(0, Math.min(100, Math.floor(level)));
  }

  incrementResourceGainLevel(): void {
    this.setResourceGainLevel(this._resourceGainLevel + 1);
  }

  getResourceGainMultiplier(): number {
    return 1 + 0.1 * this._resourceGainLevel;
  }

  getCivPointGainLevel(): number {
    return this._civPointGainLevel;
  }

  setCivPointGainLevel(level: number): void {
    this._civPointGainLevel = Math.max(0, Math.min(10, Math.floor(level)));
  }

  incrementCivPointGainLevel(): void {
    this.setCivPointGainLevel(this._civPointGainLevel + 1);
  }

  getCivPointGainMultiplier(): number {
    return 1 + 0.1 * this._civPointGainLevel;
  }

  getConstructionTimeLevel(): number {
    return this._constructionTimeLevel;
  }

  setConstructionTimeLevel(level: number): void {
    this._constructionTimeLevel = Math.max(0, Math.min(10, Math.floor(level)));
  }

  incrementConstructionTimeLevel(): void {
    this.setConstructionTimeLevel(this._constructionTimeLevel + 1);
  }

  // Placeholder: no effect yet
  getConstructionTimeMultiplier(): number {
    return 1;
  }
}
