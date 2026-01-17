import { ResourceType } from '../map/ResourceType';

/**
 * Gère l'inventaire des ressources du joueur.
 * 
 * Les ressources récoltables sont : Wood, Brick, Wheat, Sheep, Ore.
 * Les ressources non récoltables (Desert, Water) ne sont pas gérées ici.
 */
export class PlayerResources {
  private resources: Map<ResourceType, number>;

  /**
   * Crée un inventaire vide.
   */
  constructor() {
    this.resources = new Map();
    // Initialiser toutes les ressources récoltables à 0
    this.resources.set(ResourceType.Wood, 0);
    this.resources.set(ResourceType.Brick, 0);
    this.resources.set(ResourceType.Wheat, 0);
    this.resources.set(ResourceType.Sheep, 0);
    this.resources.set(ResourceType.Ore, 0);
  }

  /**
   * Ajoute une quantité de ressource à l'inventaire.
   * @param resource - Le type de ressource
   * @param amount - La quantité à ajouter (doit être positive)
   * @throws Error si la ressource n'est pas récoltable
   * @throws Error si la quantité est négative
   */
  addResource(resource: ResourceType, amount: number): void {
    if (!this.isHarvestable(resource)) {
      throw new Error(`La ressource ${resource} n'est pas récoltable.`);
    }
    if (amount < 0) {
      throw new Error('La quantité à ajouter doit être positive.');
    }

    const current = this.resources.get(resource) || 0;
    this.resources.set(resource, current + amount);
  }

  /**
   * Retire une quantité de ressource de l'inventaire.
   * @param resource - Le type de ressource
   * @param amount - La quantité à retirer (doit être positive)
   * @throws Error si la ressource n'est pas récoltable
   * @throws Error si la quantité est négative
   * @throws Error si l'inventaire n'a pas assez de ressources
   */
  removeResource(resource: ResourceType, amount: number): void {
    if (!this.isHarvestable(resource)) {
      throw new Error(`La ressource ${resource} n'est pas récoltable.`);
    }
    if (amount < 0) {
      throw new Error('La quantité à retirer doit être positive.');
    }

    const current = this.resources.get(resource) || 0;
    if (current < amount) {
      throw new Error(
        `Pas assez de ${resource}. Disponible: ${current}, requis: ${amount}.`
      );
    }

    this.resources.set(resource, current - amount);
  }

  /**
   * Retourne la quantité d'une ressource dans l'inventaire.
   * @param resource - Le type de ressource
   * @returns La quantité disponible (0 si la ressource n'est pas récoltable)
   */
  getResource(resource: ResourceType): number {
    if (!this.isHarvestable(resource)) {
      return 0;
    }
    return this.resources.get(resource) || 0;
  }

  /**
   * Vérifie si le joueur a assez d'une ressource donnée.
   * @param resource - Le type de ressource
   * @param amount - La quantité requise
   * @returns true si l'inventaire contient au moins la quantité requise
   */
  hasEnough(resource: ResourceType, amount: number): boolean {
    if (!this.isHarvestable(resource)) {
      return false;
    }
    return this.getResource(resource) >= amount;
  }

  /**
   * Vérifie si le joueur peut se permettre un coût donné.
   * Un coût est un objet avec des ressources et leurs quantités requises.
   * @param cost - Un objet Map ou Record avec les ressources et quantités requises
   * @returns true si toutes les ressources requises sont disponibles en quantité suffisante
   */
  canAfford(cost: Map<ResourceType, number> | Record<string, number>): boolean {
    // Convertir Record en Map si nécessaire
    const costMap = cost instanceof Map
      ? cost
      : new Map(
          Object.entries(cost).map(([key, value]) => [
            key as ResourceType,
            value as number,
          ])
        );

    // Vérifier chaque ressource du coût
    for (const [resource, requiredAmount] of costMap.entries()) {
      if (!this.hasEnough(resource, requiredAmount)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Retire les ressources correspondant à un coût de l'inventaire.
   * @param cost - Un objet Map ou Record avec les ressources et quantités requises
   * @throws Error si le joueur ne peut pas se permettre le coût
   */
  payCost(cost: Map<ResourceType, number> | Record<string, number>): void {
    if (!this.canAfford(cost)) {
      throw new Error('Le joueur ne peut pas se permettre ce coût.');
    }

    // Convertir Record en Map si nécessaire
    const costMap = cost instanceof Map
      ? cost
      : new Map(
          Object.entries(cost).map(([key, value]) => [
            key as ResourceType,
            value as number,
          ])
        );

    // Retirer chaque ressource
    for (const [resource, amount] of costMap.entries()) {
      this.removeResource(resource, amount);
    }
  }

  /**
   * Retourne toutes les ressources de l'inventaire.
   * @returns Un Map avec toutes les ressources et leurs quantités
   */
  getAllResources(): Map<ResourceType, number> {
    return new Map(this.resources);
  }

  /**
   * Réinitialise toutes les ressources à 0.
   */
  clear(): void {
    this.resources.set(ResourceType.Wood, 0);
    this.resources.set(ResourceType.Brick, 0);
    this.resources.set(ResourceType.Wheat, 0);
    this.resources.set(ResourceType.Sheep, 0);
    this.resources.set(ResourceType.Ore, 0);
  }

  /**
   * Vérifie si une ressource est récoltable.
   * @param resource - Le type de ressource
   * @returns true si la ressource peut être récoltée (Wood, Brick, Wheat, Sheep, Ore)
   */
  private isHarvestable(resource: ResourceType): boolean {
    return (
      resource === ResourceType.Wood ||
      resource === ResourceType.Brick ||
      resource === ResourceType.Wheat ||
      resource === ResourceType.Sheep ||
      resource === ResourceType.Ore
    );
  }
}
