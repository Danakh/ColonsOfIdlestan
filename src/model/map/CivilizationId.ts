/**
 * Identifiant unique d'une civilisation.
 * 
 * Value object immuable qui garantit l'unicité d'une civilisation.
 */
export class CivilizationId {
  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('L\'identifiant de civilisation ne peut pas être vide.');
    }
  }

  /**
   * Crée un identifiant de civilisation.
   * @param value - La valeur unique de l'identifiant
   */
  static create(value: string): CivilizationId {
    return new CivilizationId(value.trim());
  }

  /**
   * Retourne la valeur de l'identifiant.
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Vérifie si cet identifiant est égal à un autre.
   */
  equals(other: CivilizationId): boolean {
    return this.value === other.value;
  }

  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString(): string {
    return `CivilizationId(${this.value})`;
  }

  /**
   * Génère un hash pour utiliser comme clé dans des Maps/Sets.
   */
  hashCode(): string {
    return this.value;
  }

  /** Sérialise l'identifiant (valeur string). */
  serialize(): string {
    return this.value;
  }

  /** Désérialise depuis une chaîne. */
  static deserialize(data: string): CivilizationId {
    return CivilizationId.create(data);
  }
}
