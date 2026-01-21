import { BuildingType, getBuildingUpgradeCost } from './BuildingType';
import { ResourceType } from '../map/ResourceType';

/**
 * Format sérialisé d'un bâtiment.
 */
export interface BuildingSerialized {
  type: string;
  level: number;
}

/**
 * Représente un bâtiment construit dans une ville.
 * 
 * Un bâtiment a un type qui détermine ses capacités et un niveau
 * qui peut être amélioré pour augmenter son efficacité.
 */
export class Building {
  private _level: number;

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
    this._level = level;
  }

  /**
   * Retourne le niveau actuel du bâtiment.
   */
  get level(): number {
    return this._level;
  }

  /**
   * Vérifie si le bâtiment peut être amélioré.
   * @returns true si le bâtiment peut être amélioré
   */
  canUpgrade(): boolean {
    // Pas de limite de niveau pour l'instant
    return true;
  }

  /**
   * Retourne le coût d'amélioration pour passer au niveau suivant.
   * @returns Le coût sous forme de Map<ResourceType, number>
   */
  getUpgradeCost(): Map<ResourceType, number> {
    return getBuildingUpgradeCost(this.type, this._level);
  }

  /**
   * Améliore le bâtiment au niveau suivant.
   * @throws Error si le bâtiment ne peut pas être amélioré
   */
  upgrade(): void {
    if (!this.canUpgrade()) {
      throw new Error(`Le bâtiment ${this.type} ne peut pas être amélioré.`);
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

  /**
   * Sérialise le bâtiment.
   */
  serialize(): BuildingSerialized {
    return {
      type: this.type,
      level: this._level,
    };
  }

  /**
   * Désérialise un bâtiment.
   * @param data - Les données sérialisées
   * @returns Un nouveau bâtiment
   */
  static deserialize(data: BuildingSerialized): Building {
    return new Building(data.type as BuildingType, data.level);
  }
}
