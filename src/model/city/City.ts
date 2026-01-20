import { Vertex } from '../hex/Vertex';
import { CivilizationId } from '../map/CivilizationId';
import { CityLevel, isValidCityLevel } from './CityLevel';
import { BuildingType, getAllBuildingTypes, getResourceProductionBuildings } from './BuildingType';

/** Format sérialisé d'une ville. */
export interface CitySerialized {
  vertex: [number, number][];
  owner: string;
  level: number;
  buildings: string[];
  buildingProductionTimes: Record<string, number>;
}

/**
 * Représente une ville sur la carte de jeu.
 * 
 * Une ville est située sur un sommet (vertex) et appartient à une civilisation.
 * Elle a un niveau qui détermine ses capacités et le nombre de bâtiments qu'elle peut construire.
 */
export class City {
  private readonly buildings: BuildingType[] = [];
  /** Temps de dernière production pour chaque bâtiment de ressource (en secondes depuis le début) */
  private readonly buildingProductionTimes: Map<BuildingType, number> = new Map();

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
    return (this.level + 1) * 2;
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
    
    // Si c'est un bâtiment de ressource, initialiser son temps de production
    // Le temps initial sera défini lors de la construction via setBuildingProductionTime
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
      case BuildingType.Seaport:
      case BuildingType.TownHall:
        // Port maritime et hôtel de ville disponibles au niveau Outpost (0)
        return this.level >= CityLevel.Outpost;

      case BuildingType.Sawmill:
      case BuildingType.Brickworks:
      case BuildingType.Mill:
      case BuildingType.Sheepfold:
      case BuildingType.Mine:
        // Bâtiments de production de ressources disponibles à partir du niveau Colony (1)
        return this.level >= CityLevel.Colony;

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
    return this.hasBuilding(BuildingType.TownHall);
  }

  /**
   * Enregistre le temps de dernière production pour un bâtiment de ressource.
   * @param buildingType - Le type de bâtiment
   * @param timeSeconds - Le temps en secondes
   */
  setBuildingProductionTime(buildingType: BuildingType, timeSeconds: number): void {
    // Vérifier que c'est un bâtiment de ressource
    const resourceBuildings = getResourceProductionBuildings();
    if (!resourceBuildings.includes(buildingType)) {
      throw new Error(`Le bâtiment ${buildingType} n'est pas un bâtiment de production de ressources.`);
    }
    
    // Vérifier que le bâtiment est construit
    if (!this.hasBuilding(buildingType)) {
      throw new Error(`Le bâtiment ${buildingType} n'est pas construit dans cette ville.`);
    }
    
    this.buildingProductionTimes.set(buildingType, timeSeconds);
  }

  /**
   * Retourne le temps de dernière production d'un bâtiment de ressource.
   * @param buildingType - Le type de bâtiment
   * @returns Le temps de dernière production en secondes, ou undefined si jamais produit
   */
  getBuildingProductionTime(buildingType: BuildingType): number | undefined {
    return this.buildingProductionTimes.get(buildingType);
  }

  /**
   * Met à jour le temps de dernière production après une production réussie.
   * Le nouveau temps est calculé comme : ancien temps + intervalle de production.
   * @param buildingType - Le type de bâtiment
   * @param newTimeSeconds - Le nouveau temps (ancien temps + intervalle)
   */
  updateBuildingProductionTime(buildingType: BuildingType, newTimeSeconds: number): void {
    this.setBuildingProductionTime(buildingType, newTimeSeconds);
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

  /** Sérialise la ville (vertex, owner, level, buildings, buildingProductionTimes). */
  serialize(): CitySerialized {
    const bpt: Record<string, number> = {};
    for (const bt of getResourceProductionBuildings()) {
      if (this.hasBuilding(bt)) {
        const t = this.getBuildingProductionTime(bt);
        if (t !== undefined) bpt[bt] = t;
      }
    }
    return {
      vertex: this.vertex.serialize(),
      owner: this.owner.serialize(),
      level: this.level,
      buildings: [...this.getBuildings()],
      buildingProductionTimes: bpt,
    };
  }
}
