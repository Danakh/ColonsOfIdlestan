import { Vertex } from '../hex/Vertex';
import { CivilizationId } from '../map/CivilizationId';
import { CityLevel, isValidCityLevel } from './CityLevel';
import { BuildingType, getAllBuildingTypes } from './BuildingType';

/**
 * Représente une ville sur la carte de jeu.
 * 
 * Une ville est située sur un sommet (vertex) et appartient à une civilisation.
 * Elle a un niveau qui détermine ses capacités et le nombre de bâtiments qu'elle peut construire.
 */
export class City {
  private readonly buildings: BuildingType[] = [];

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
   * @param buildingType - Le type de bâtiment à ajouter
   * @throws Error si la ville ne peut pas construire de bâtiment supplémentaire
   * @throws Error si le bâtiment n'est pas constructible dans cette ville
   * @throws Error si le bâtiment est déjà construit
   */
  addBuilding(buildingType: BuildingType): void {
    if (!this.canBuildBuilding()) {
      throw new Error(
        `La ville ne peut pas construire plus de ${this.getMaxBuildings()} bâtiments (niveau ${this.level}).`
      );
    }

    if (!this.canBuildBuildingType(buildingType)) {
      throw new Error(
        `Le bâtiment ${buildingType} n'est pas constructible dans cette ville (niveau ${this.level}).`
      );
    }

    if (this.hasBuilding(buildingType)) {
      throw new Error(`Le bâtiment ${buildingType} est déjà construit dans cette ville.`);
    }

    this.buildings.push(buildingType);
  }

  /**
   * Retourne la liste des bâtiments construits.
   * @returns Un tableau des types de bâtiments construits
   */
  getBuildings(): readonly BuildingType[] {
    return [...this.buildings];
  }

  /**
   * Vérifie si un type de bâtiment est construit dans la ville.
   * @param buildingType - Le type de bâtiment à vérifier
   * @returns true si le bâtiment est construit
   */
  hasBuilding(buildingType: BuildingType): boolean {
    return this.buildings.includes(buildingType);
  }

  /**
   * Retourne la liste des bâtiments constructibles pour cette ville.
   * Les bâtiments constructibles dépendent du niveau de la ville.
   * @returns Un tableau des types de bâtiments constructibles
   */
  getBuildableBuildings(): BuildingType[] {
    const allBuildings = getAllBuildingTypes();
    const buildableBuildings: BuildingType[] = [];

    for (const buildingType of allBuildings) {
      if (this.canBuildBuildingType(buildingType)) {
        buildableBuildings.push(buildingType);
      }
    }

    return buildableBuildings;
  }

  /**
   * Vérifie si un type de bâtiment peut être construit dans cette ville.
   * @param buildingType - Le type de bâtiment à vérifier
   * @returns true si le bâtiment peut être construit
   */
  canBuildBuildingType(buildingType: BuildingType): boolean {
    // Vérifier si le bâtiment est déjà construit
    if (this.hasBuilding(buildingType)) {
      return false;
    }

    // Vérifier si on a encore de la place
    if (!this.canBuildBuilding()) {
      return false;
    }

    // Règles de disponibilité selon le niveau de la ville
    switch (buildingType) {
      case BuildingType.CityHall:
        // L'hôtel de ville est toujours constructible (sauf s'il est déjà construit)
        return true;

      case BuildingType.Warehouse:
      case BuildingType.Market:
        // Entrepôt et marché disponibles dès le niveau Outpost
        return true;

      case BuildingType.Forge:
      case BuildingType.Farm:
        // Forge et ferme disponibles à partir du niveau Colony
        return this.level >= CityLevel.Colony;

      case BuildingType.Sawmill:
      case BuildingType.Quarry:
        // Scierie et carrière disponibles à partir du niveau Town
        return this.level >= CityLevel.Town;

      case BuildingType.Barracks:
        // Caserne disponible à partir du niveau Metropolis
        return this.level >= CityLevel.Metropolis;

      default:
        return false;
    }
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
   * @returns true si la ville a un hôtel de ville
   */
  hasCityHall(): boolean {
    return this.hasBuilding(BuildingType.CityHall);
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
