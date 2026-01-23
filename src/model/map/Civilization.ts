import { CivilizationId } from './CivilizationId';

/**
 * Format sérialisé d'une civilisation.
 */
export interface CivilizationSerialized {
  id: string;
  autoRoadConstruction?: boolean;
  autoOutpostConstruction?: boolean;
  autoCityUpgrade?: boolean;
  autoProductionBuildingConstruction?: boolean;
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
    return civ;
  }
}
