import { HexCoord } from '../hex/HexCoord';
import { Vertex } from '../hex/Vertex';
import { ResourceType } from '../map/ResourceType';
import { GameMap } from '../map/GameMap';
import { CivilizationId } from '../map/CivilizationId';
import { PlayerResources } from './PlayerResources';

/**
 * Gère la logique de récolte de ressources par clic sur les hexagones.
 * 
 * Un hexagone est récoltable si :
 * - Il est adjacent à une ville du joueur (la ville est sur un vertex qui contient cet hexagone)
 * - Il est visible (déterminé par GameMap.isHexVisible)
 * - Il contient une ressource récoltable (pas Desert ni Water)
 */
export class ResourceHarvest {
  /**
   * Calcule le gain de ressource pour un hexagone donné.
   * Le gain de base est de 1 par hexagone, mais peut être modifié par des bonus futurs.
   * @param resourceType - Le type de ressource de l'hexagone
   * @returns La quantité de ressource gagnée (0 si non récoltable)
   */
  static calculateGain(resourceType: ResourceType): number {
    // Pour l'instant, gain de base de 1 par hexagone
    // Peut être étendu avec des bonus de bâtiments plus tard
    if (
      resourceType === ResourceType.Wood ||
      resourceType === ResourceType.Brick ||
      resourceType === ResourceType.Wheat ||
      resourceType === ResourceType.Sheep ||
      resourceType === ResourceType.Ore
    ) {
      return 1;
    }
    return 0;
  }

  /**
   * Vérifie si un hexagone est adjacent à une ville du joueur.
   * Un hexagone est adjacent à une ville si la ville est sur un vertex qui contient cet hexagone.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param gameMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @returns true si l'hexagone est adjacent à au moins une ville du joueur
   */
  static isAdjacentToPlayerCity(
    hexCoord: HexCoord,
    gameMap: GameMap,
    civId: CivilizationId
  ): boolean {
    const grid = gameMap.getGrid();
    
    // Obtenir tous les vertices qui touchent cet hexagone
    const vertices = grid.getVerticesForHex(hexCoord);
    
    // Vérifier si au moins un vertex a une ville appartenant au joueur
    for (const vertex of vertices) {
      if (gameMap.hasCity(vertex)) {
        const owner = gameMap.getCityOwner(vertex);
        if (owner && owner.equals(civId)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Vérifie si un hexagone peut être récolté par le joueur.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param gameMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @returns true si l'hexagone est récoltable
   */
  static canHarvest(
    hexCoord: HexCoord,
    gameMap: GameMap,
    civId: CivilizationId
  ): boolean {
    // Vérifier que l'hexagone existe dans la grille
    const grid = gameMap.getGrid();
    if (!grid.hasHex(hexCoord)) {
      return false;
    }

    // Vérifier que l'hexagone est visible
    if (!gameMap.isHexVisible(hexCoord)) {
      return false;
    }

    // Vérifier que l'hexagone est adjacent à une ville du joueur
    if (!this.isAdjacentToPlayerCity(hexCoord, gameMap, civId)) {
      return false;
    }

    // Vérifier que l'hexagone contient une ressource récoltable
    const resource = gameMap.getResource(hexCoord);
    if (!resource) {
      return false;
    }

    return (
      resource === ResourceType.Wood ||
      resource === ResourceType.Brick ||
      resource === ResourceType.Wheat ||
      resource === ResourceType.Sheep ||
      resource === ResourceType.Ore
    );
  }

  /**
   * Récolte les ressources d'un hexagone et les ajoute à l'inventaire du joueur.
   * @param hexCoord - La coordonnée de l'hexagone à récolter
   * @param gameMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @param playerResources - L'inventaire du joueur
   * @returns La quantité de ressource récoltée (0 si la récolte a échoué)
   * @throws Error si l'hexagone ne peut pas être récolté
   */
  static harvest(
    hexCoord: HexCoord,
    gameMap: GameMap,
    civId: CivilizationId,
    playerResources: PlayerResources
  ): number {
    // Vérifier que la récolte est possible
    if (!this.canHarvest(hexCoord, gameMap, civId)) {
      throw new Error(
        `L'hexagone à ${hexCoord.toString()} ne peut pas être récolté.`
      );
    }

    // Obtenir le type de ressource
    const resource = gameMap.getResource(hexCoord);
    if (!resource) {
      throw new Error(
        `Aucune ressource trouvée sur l'hexagone à ${hexCoord.toString()}.`
      );
    }

    // Calculer le gain
    const gain = this.calculateGain(resource);
    
    if (gain > 0) {
      // Ajouter la ressource à l'inventaire
      playerResources.addResource(resource, gain);
    }

    return gain;
  }
}
