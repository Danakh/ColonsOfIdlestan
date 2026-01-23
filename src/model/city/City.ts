import { Vertex } from '../hex/Vertex';
import { CivilizationId } from '../map/CivilizationId';
import { CityLevel, isValidCityLevel } from './CityLevel';
import { BuildingType, getAllBuildingTypes, getResourceProductionBuildings } from './BuildingType';
import { Building, type BuildingSerialized } from './Building';
import { ResourceType } from '../map/ResourceType';

/** Format sérialisé d'une ville. */
export interface CitySerialized {
  vertex: [number, number][];
  owner: string;
  buildings: BuildingSerialized[];
}

/**
 * Représente une ville sur la carte de jeu.
 * 
 * Une ville est située sur un sommet (vertex) et appartient à une civilisation.
 * Elle a un niveau qui détermine ses capacités et le nombre de bâtiments qu'elle peut construire.
 */
export class City {
  private readonly buildings: Map<BuildingType, Building> = new Map();

  /**
   * Crée une nouvelle ville.
   * @param vertex - Le sommet où se trouve la ville
   * @param owner - L'identifiant de la civilisation propriétaire
   * @param initialLevel - Niveau initial (Outpost par défaut). Si > 0, cela crée un TownHall au niveau correspondant.
   */
  constructor(
    public readonly vertex: Vertex,
    public readonly owner: CivilizationId,
    initialLevel: CityLevel = CityLevel.Outpost
  ) {
    if (!isValidCityLevel(initialLevel)) {
      throw new Error(`Niveau de ville invalide: ${initialLevel}. Doit être entre ${CityLevel.Outpost} et ${CityLevel.Capital}.`);
    }
    // Le niveau de ville est dérivé du TownHall. Un Outpost n'a pas de TownHall.
    if (initialLevel > CityLevel.Outpost) {
      this.buildings.set(BuildingType.TownHall, new Building(BuildingType.TownHall, initialLevel));
    }
  }

  /**
   * Niveau actuel de la ville.
   * Dérivé du niveau du TownHall (1..4). Sans TownHall, la ville est Outpost (0).
   */
  get level(): CityLevel {
    const townHall = this.getBuilding(BuildingType.TownHall);
    if (!townHall) {
      return CityLevel.Outpost;
    }
    const lvl = townHall.level;
    if (!isValidCityLevel(lvl)) {
      throw new Error(`Niveau de TownHall invalide: ${lvl}.`);
    }
    return lvl;
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
    return this.buildings.size;
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

    this.buildings.set(buildingType, new Building(buildingType));
    
    // Si c'est un bâtiment de ressource, initialiser son temps de production
    // Le temps initial sera défini lors de la construction via setBuildingProductionTime
  }

  /**
   * Ajoute un bâtiment à la ville avec un niveau spécifique (utilisé pour la désérialisation).
   * @param buildingType - Le type de bâtiment à ajouter
   * @param level - Le niveau du bâtiment
   * @param specialization - La spécialisation optionnelle (pour les ports niveau 2)
   * @param autoTradeEnabled - Le commerce automatique activé optionnel (pour les ports niveau 3)
   */
  addBuildingWithLevel(
    buildingType: BuildingType,
    level: number,
    specialization?: ResourceType,
    autoTradeEnabled?: boolean
  ): void {
    if (this.hasBuilding(buildingType)) {
      throw new Error(`Le bâtiment ${buildingType} est déjà construit dans cette ville.`);
    }
    const building = new Building(buildingType, level);
    if (specialization !== undefined) {
      building.setSpecialization(specialization);
    }
    if (autoTradeEnabled !== undefined && autoTradeEnabled) {
      building.setAutoTradeEnabled(true);
    }
    this.buildings.set(buildingType, building);
  }

  /**
   * Retourne la liste des types de bâtiments construits.
   * @returns Un tableau des types de bâtiments construits
   */
  getBuildings(): readonly BuildingType[] {
    return [...this.buildings.keys()];
  }

  /**
   * Retourne un bâtiment par son type.
   * @param buildingType - Le type de bâtiment
   * @returns Le bâtiment, ou undefined si non construit
   */
  getBuilding(buildingType: BuildingType): Building | undefined {
    return this.buildings.get(buildingType);
  }

  /**
   * Retourne la liste des bâtiments de production de ressources construits dans cette ville.
   * Inclut les bâtiments de production de ressources normaux et le marché niveau 2.
   * @returns Un tableau des bâtiments de production
   */
  getProductionBuildings(): Building[] {
    const productionTypes = getResourceProductionBuildings();
    const result: Building[] = [];
    for (const [type, building] of this.buildings) {
      if (productionTypes.includes(type)) {
        result.push(building);
      } else if (type === BuildingType.Market && building.level === 2) {
        // Le marché niveau 2 produit des ressources aléatoires
        result.push(building);
      }
    }
    return result;
  }

  /**
   * Vérifie si un type de bâtiment est construit dans la ville.
   * @param buildingType - Le type de bâtiment à vérifier
   * @returns true si le bâtiment est construit
   */
  hasBuilding(buildingType: BuildingType): boolean {
    return this.buildings.has(buildingType);
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
      case BuildingType.Warehouse:
      case BuildingType.Forge:
      case BuildingType.Library:
        return this.level >= CityLevel.Town; // Niveau 2 (Ville)
      case BuildingType.Temple:
        return this.level >= CityLevel.Metropolis; // Niveau 3 (Métropole)
      case BuildingType.BuildersGuild:
        return this.level >= CityLevel.Capital; // Niveau 4 (Capitale)
      case BuildingType.Market:
      case BuildingType.TownHall:
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
   * Vérifie si la ville a un hôtel de ville (requis pour l'amélioration).
   * @returns true si la ville a un hôtel de ville
   */
  hasCityHall(): boolean {
    return this.hasBuilding(BuildingType.TownHall);
  }

  /**
   * Retourne le niveau d'un bâtiment.
   * @param buildingType - Le type de bâtiment
   * @returns Le niveau du bâtiment (1 = niveau de base), ou undefined si non construit
   */
  getBuildingLevel(buildingType: BuildingType): number | undefined {
    const building = this.buildings.get(buildingType);
    return building?.level;
  }

  /**
   * Vérifie si un bâtiment peut être amélioré.
   * @param buildingType - Le type de bâtiment
   * @returns true si le bâtiment peut être amélioré
   */
  canUpgradeBuilding(buildingType: BuildingType): boolean {
    const building = this.buildings.get(buildingType);
    if (!building) {
      return false;
    }
    return building.canUpgrade();
  }

  /**
   * Améliore un bâtiment au niveau suivant.
   * @param buildingType - Le type de bâtiment à améliorer
   * @throws Error si le bâtiment n'est pas construit
   */
  upgradeBuilding(buildingType: BuildingType): void {
    const building = this.buildings.get(buildingType);
    if (!building) {
      throw new Error(`Le bâtiment ${buildingType} n'est pas construit dans cette ville.`);
    }
    building.upgrade();
  }

  /**
   * Définit le niveau d'un bâtiment (utilisé pour la désérialisation).
   * @param buildingType - Le type de bâtiment
   * @param level - Le niveau à définir
   */
  setBuildingLevel(buildingType: BuildingType, level: number): void {
    const building = this.buildings.get(buildingType);
    if (!building) {
      throw new Error(`Le bâtiment ${buildingType} n'est pas construit dans cette ville.`);
    }
    building.setLevel(level);
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

  /** Sérialise la ville (vertex, owner, buildings). */
  serialize(): CitySerialized {
    return {
      vertex: this.vertex.serialize(),
      owner: this.owner.serialize(),
      buildings: [...this.buildings.values()].map(b => b.serialize()),
    };
  }
}
