import { Vertex } from '../hex/Vertex';
import { CivilizationId } from '../map/CivilizationId';
import { CityLevel, isValidCityLevel } from './CityLevel';

/**
 * Représente une ville sur la carte de jeu.
 * 
 * Une ville est située sur un sommet (vertex) et appartient à une civilisation.
 * Elle a un niveau qui détermine ses capacités et le nombre de bâtiments qu'elle peut construire.
 */
export class City {
  private readonly buildings: string[] = []; // Pour l'instant, on stocke juste les IDs. Sera remplacé par Building[] plus tard

  /**
   * Crée une nouvelle ville.
   * @param vertex - Le sommet où se trouve la ville
   * @param owner - L'identifiant de la civilisation propriétaire
   * @param level - Le niveau de la ville (par défaut: Outpost)
   */
  constructor(
    public readonly vertex: Vertex,
    public readonly owner: CivilizationId,
    public level: CityLevel = CityLevel.Outpost
  ) {
    if (!isValidCityLevel(level)) {
      throw new Error(`Niveau de ville invalide: ${level}. Doit être entre ${CityLevel.Outpost} et ${CityLevel.Capital}.`);
    }
  }

  /**
   * Retourne le nombre maximum de bâtiments qu'une ville de ce niveau peut construire.
   * @returns Le nombre maximum de bâtiments
   */
  getMaxBuildings(): number {
    // Limite de bâtiments par niveau :
    // Outpost (0): 1 bâtiment
    // Colony (1): 2 bâtiments
    // Town (2): 3 bâtiments
    // Metropolis (3): 4 bâtiments
    // Capital (4): 5 bâtiments
    return this.level + 1;
  }

  /**
   * Retourne le nombre de bâtiments actuellement construits.
   * @returns Le nombre de bâtiments construits
   */
  getBuildingCount(): number {
    return this.buildings.length;
  }

  /**
   * Vérifie si la ville peut construire un bâtiment supplémentaire.
   * @returns true si la ville peut construire un nouveau bâtiment
   */
  canBuildBuilding(): boolean {
    return this.getBuildingCount() < this.getMaxBuildings();
  }

  /**
   * Ajoute un bâtiment à la ville.
   * @param buildingId - L'identifiant du bâtiment à ajouter
   * @throws Error si la ville ne peut pas construire de bâtiment supplémentaire
   */
  addBuilding(buildingId: string): void {
    if (!this.canBuildBuilding()) {
      throw new Error(
        `La ville ne peut pas construire plus de ${this.getMaxBuildings()} bâtiments (niveau ${this.level}).`
      );
    }
    this.buildings.push(buildingId);
  }

  /**
   * Retourne la liste des bâtiments construits.
   * @returns Un tableau des identifiants de bâtiments
   */
  getBuildings(): readonly string[] {
    return [...this.buildings];
  }

  /**
   * Vérifie si la ville peut être améliorée au niveau suivant.
   * @returns true si la ville peut être améliorée
   */
  canUpgrade(): boolean {
    return this.level < CityLevel.Capital;
  }

  /**
   * Améliore la ville au niveau suivant.
   * @throws Error si la ville ne peut pas être améliorée (déjà au niveau maximum)
   */
  upgrade(): void {
    if (!this.canUpgrade()) {
      throw new Error(`La ville ne peut pas être améliorée au-delà du niveau ${CityLevel.Capital} (Capitale).`);
    }
    this.level = this.level + 1;
  }

  /**
   * Vérifie si la ville a un hôtel de ville (requis pour l'amélioration).
   * Pour l'instant, on suppose qu'une ville niveau > Outpost a forcément un hôtel de ville.
   * @returns true si la ville a un hôtel de ville
   */
  hasCityHall(): boolean {
    // Pour l'instant, on vérifie simplement si la ville a un bâtiment.
    // Plus tard, on vérifiera spécifiquement le BuildingType.CityHall
    return this.level > CityLevel.Outpost || this.buildings.length > 0;
  }

  /**
   * Vérifie l'égalité avec une autre ville (basé sur le vertex).
   */
  equals(other: City): boolean {
    return this.vertex.equals(other.vertex);
  }

  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString(): string {
    return `City(vertex=${this.vertex.toString()}, level=${this.level}, owner=${this.owner.toString()})`;
  }
}
