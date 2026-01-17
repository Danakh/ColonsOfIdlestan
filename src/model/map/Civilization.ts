import { CivilizationId } from './CivilizationId';

/**
 * Représente une civilisation dans le jeu.
 * 
 * Entité légère optionnelle qui peut contenir des informations
 * supplémentaires sur une civilisation. L'identifiant seul (CivilizationId)
 * peut suffire dans certains cas.
 */
export class Civilization {
  /**
   * Crée une nouvelle civilisation.
   * @param id - L'identifiant unique de la civilisation
   */
  constructor(public readonly id: CivilizationId) {}

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
}
