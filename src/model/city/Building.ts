import { BuildingType, getBuildingUpgradeCost, getResourceProductionBuildings } from './BuildingType';
import { ResourceType } from '../map/ResourceType';

/**
 * Représente un bâtiment construit dans une ville.
 * 
 * Un bâtiment a un type qui détermine ses capacités et un niveau
 * qui peut être amélioré pour augmenter son efficacité.
 */
export class Building {
  private _level: number;
  private _productionTimeSeconds: number | undefined;
  private static readonly DEFAULT_MAX_LEVEL = 1;
  private static readonly PRODUCTION_MAX_LEVEL = 5;

  /**
   * Crée un nouveau bâtiment.
   * @param type - Le type de bâtiment
   * @param level - Le niveau initial (par défaut: 1)
   */
  constructor(
    public readonly type: BuildingType,
    level: number = 1
  ) {
    if (level < 1) {
      throw new Error(`Le niveau doit être au moins 1.`);
    }
    const maxLevel = Building.getMaxLevel(type);
    if (level > maxLevel) {
      throw new Error(`Le niveau ne peut pas dépasser ${maxLevel}.`);
    }
    this._level = level;
  }

  /**
   * Retourne le niveau actuel du bâtiment.
   */
  get level(): number {
    return this._level;
  }

  /**
   * Niveau maximum autorisé pour ce bâtiment.
   * Par défaut: 1. Bâtiments de production: 5.
   */
  getMaxLevel(): number {
    return Building.getMaxLevel(this.type);
  }

  private static getMaxLevel(type: BuildingType): number {
    return getResourceProductionBuildings().includes(type)
      ? Building.PRODUCTION_MAX_LEVEL
      : Building.DEFAULT_MAX_LEVEL;
  }

  /**
   * Retourne le temps de dernière production (en secondes depuis le début), ou undefined si jamais produit.
   */
  getProductionTimeSeconds(): number | undefined {
    return this._productionTimeSeconds;
  }

  /**
   * Définit le temps de dernière production (en secondes depuis le début).
   */
  setProductionTimeSeconds(timeSeconds: number): void {
    this._productionTimeSeconds = timeSeconds;
  }

  /**
   * Met à jour le temps de dernière production.
   * Alias de setProductionTimeSeconds pour garder un nom explicite.
   */
  updateProductionTimeSeconds(newTimeSeconds: number): void {
    this._productionTimeSeconds = newTimeSeconds;
  }

  /**
   * Vérifie si le bâtiment peut être amélioré.
   * @returns true si le bâtiment peut être amélioré
   */
  canUpgrade(): boolean {
    return this._level < this.getMaxLevel();
  }

  /**
   * Retourne le coût d'amélioration pour passer au niveau suivant.
   * @returns Le coût sous forme de Map<ResourceType, number>
   */
  getUpgradeCost(): Map<ResourceType, number> {
    if (!this.canUpgrade()) {
      throw new Error(`Le bâtiment ${this.type} est déjà au niveau maximum (${this.getMaxLevel()}).`);
    }
    return getBuildingUpgradeCost(this.type, this._level);
  }

  /**
   * Améliore le bâtiment au niveau suivant.
   * @throws Error si le bâtiment ne peut pas être amélioré
   */
  upgrade(): void {
    if (!this.canUpgrade()) {
      throw new Error(`Le bâtiment ${this.type} est déjà au niveau maximum (${this.getMaxLevel()}).`);
    }
    this._level += 1;
  }

  /**
   * Définit le niveau du bâtiment (utilisé pour la désérialisation).
   * @param level - Le niveau à définir
   */
  setLevel(level: number): void {
    if (level < 1) {
      throw new Error(`Le niveau doit être au moins 1.`);
    }
    const maxLevel = this.getMaxLevel();
    if (level > maxLevel) {
      throw new Error(`Le niveau ne peut pas dépasser ${maxLevel}.`);
    }
    this._level = level;
  }

  /**
   * Vérifie l'égalité avec un autre bâtiment (basé sur le type).
   */
  equals(other: Building): boolean {
    return this.type === other.type;
  }

  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString(): string {
    return `Building(type=${this.type}, level=${this._level})`;
  }
}
