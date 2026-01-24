import { BuildingType, getBuildingUpgradeCost, getResourceProductionBuildings } from './BuildingType';
import { ResourceType } from '../map/ResourceType';

/** Format sérialisé d'un bâtiment (généré par `Building.serialize()`). */
export interface BuildingSerialized {
  type: string;
  level: number;
  productionTimeSeconds?: number;
  specialization?: string;
  autoTradeEnabled?: boolean;
}

/**
 * Représente un bâtiment construit dans une ville.
 * 
 * Un bâtiment a un type qui détermine ses capacités et un niveau
 * qui peut être amélioré pour augmenter son efficacité.
 */
export class Building {
  private _level: number;
  private _productionTimeSeconds: number | undefined;
  private _specialization: ResourceType | undefined;
  private _autoTradeEnabled: boolean;
  private static readonly DEFAULT_MAX_LEVEL = 1;
  private static readonly PRODUCTION_MAX_LEVEL = 5;
  private static readonly TOWN_HALL_MAX_LEVEL = 4;
  private static readonly MARKET_MAX_LEVEL = 2;
  private static readonly SEAPORT_MAX_LEVEL = 4;
  private static readonly BUILDERS_GUILD_MAX_LEVEL = 3;

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
    this._autoTradeEnabled = false;
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
    if (type === BuildingType.TownHall) {
      return Building.TOWN_HALL_MAX_LEVEL;
    }
    if (type === BuildingType.Market) {
      return Building.MARKET_MAX_LEVEL;
    }
    if (type === BuildingType.Seaport) {
      return Building.SEAPORT_MAX_LEVEL;
    }
    if (type === BuildingType.BuildersGuild) {
      return Building.BUILDERS_GUILD_MAX_LEVEL;
    }
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
    // Pour le port niveau 2, nécessite une spécialisation pour passer au niveau 3
    if (this.type === BuildingType.Seaport && this._level === 2) {
      return this._specialization !== undefined && this._level < this.getMaxLevel();
    }
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
   * Retourne la spécialisation du bâtiment (pour les ports niveau 2).
   * @returns La ressource spécialisée, ou undefined si aucune spécialisation
   */
  getSpecialization(): ResourceType | undefined {
    return this._specialization;
  }

  /**
   * Définit la spécialisation du bâtiment (pour les ports niveau 2).
   * Permet aussi de définir la spécialisation au niveau 3 lors de la désérialisation
   * si elle n'est pas déjà définie.
   * @param resource - La ressource à spécialiser
   * @throws Error si le bâtiment n'est pas un port niveau 2 ou 3
   */
  setSpecialization(resource: ResourceType): void {
    if (this.type !== BuildingType.Seaport) {
      throw new Error(`Seul le port maritime peut être spécialisé.`);
    }
    // Permettre la spécialisation au niveau 2 (normal) ou au niveau 3 (pour désérialisation)
    if (this._level !== 2 && this._level !== 3) {
      throw new Error(`Le port doit être au niveau 2 ou 3 pour être spécialisé.`);
    }
    // Au niveau 3, permettre seulement si la spécialisation n'est pas déjà définie (désérialisation)
    if (this._level === 3 && this._specialization !== undefined) {
      // Si la spécialisation est déjà définie et différente, c'est une erreur
      if (this._specialization !== resource) {
        throw new Error(`Le port niveau 3 a déjà une spécialisation (${this._specialization}).`);
      }
      // Si c'est la même, on peut ignorer silencieusement
      return;
    }
    this._specialization = resource;
  }

  /**
   * Active ou désactive le commerce automatique (pour les ports niveau 3).
   * @param enabled - true pour activer, false pour désactiver
   * @throws Error si le bâtiment n'est pas un port niveau 3
   */
  setAutoTradeEnabled(enabled: boolean): void {
    if (this.type !== BuildingType.Seaport) {
      throw new Error(`Seul le port maritime peut avoir le commerce automatique.`);
    }
    if (this._level !== 3) {
      throw new Error(`Le port doit être au niveau 3 pour activer le commerce automatique.`);
    }
    this._autoTradeEnabled = enabled;
  }

  /**
   * Vérifie si le commerce automatique est activé (pour les ports niveau 3).
   * @returns true si le commerce automatique est activé
   */
  isAutoTradeEnabled(): boolean {
    return this._autoTradeEnabled;
  }

  /**
   * Vérifie si la construction automatique de routes peut être activée (Guilde des batisseurs niveau 1+).
   * @returns true si l'automatisation peut être activée
   */
  canEnableAutoRoadConstruction(): boolean {
    return this.type === BuildingType.BuildersGuild && this._level >= 1;
  }

  /**
   * Vérifie si la construction automatique d'outposts peut être activée (Guilde des batisseurs niveau 2+).
   * @returns true si l'automatisation peut être activée
   */
  canEnableAutoOutpostConstruction(): boolean {
    return this.type === BuildingType.BuildersGuild && this._level >= 2;
  }

  /**
   * Vérifie si l'amélioration automatique de villes peut être activée (Guilde des batisseurs niveau 2+).
   * @returns true si l'automatisation peut être activée
   */
  canEnableAutoCityUpgrade(): boolean {
    return this.type === BuildingType.BuildersGuild && this._level >= 2;
  }

  /**
   * Vérifie si la construction automatique de bâtiments de production peut être activée (Guilde des batisseurs niveau 3).
   * @returns true si l'automatisation peut être activée
   */
  canEnableAutoProductionBuildingConstruction(): boolean {
    return this.type === BuildingType.BuildersGuild && this._level >= 3;
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

  /**
   * Sérialise le bâtiment. La sérialisation globale est orchestrée par `City.serialize()`,
   * mais le format de chaque bâtiment est défini ici.
   */
  serialize(): BuildingSerialized {
    const result: BuildingSerialized = {
      type: this.type,
      level: this._level,
      productionTimeSeconds: this._productionTimeSeconds,
      specialization: this._specialization,
    };
    if (this._autoTradeEnabled) {
      result.autoTradeEnabled = this._autoTradeEnabled;
    }
    return result;
  }
}
