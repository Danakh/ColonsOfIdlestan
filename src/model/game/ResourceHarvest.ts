import { HexCoord } from '../hex/HexCoord';
import { Vertex } from '../hex/Vertex';
import { ResourceType } from '../map/ResourceType';
import { HexType } from '../map/HexType';
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
   * Convertit un HexType en ResourceType si c'est une ressource récoltable.
   * @param hexType - Le type d'hexagone
   * @returns Le ResourceType correspondant, ou null si non récoltable
   */
  static hexTypeToResourceType(hexType: HexType): ResourceType | null {
    switch (hexType) {
      case HexType.Wood:
        return ResourceType.Wood;
      case HexType.Brick:
        return ResourceType.Brick;
      case HexType.Wheat:
        return ResourceType.Wheat;
      case HexType.Sheep:
        return ResourceType.Sheep;
      case HexType.Ore:
        return ResourceType.Ore;
      default:
        return null;
    }
  }

  /**
   * Calcule le gain de ressource pour un hexagone donné.
   * Le gain de base est de 1 par hexagone, mais peut être modifié par des bonus futurs.
   * @param hexType - Le type d'hexagone
   * @returns La quantité de ressource gagnée (0 si non récoltable)
   */
  static calculateGain(hexType: HexType): number {
    // Pour l'instant, gain de base de 1 par hexagone
    // Peut être étendu avec des bonus de bâtiments plus tard
    return this.hexTypeToResourceType(hexType) !== null ? 1 : 0;
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
    const hexType = gameMap.getResource(hexCoord);
    if (!hexType) {
      return false;
    }

    // Vérifier si le type d'hexagone est une ressource récoltable
    return this.hexTypeToResourceType(hexType) !== null;
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

    // Obtenir le type d'hexagone
    const hexType = gameMap.getResource(hexCoord);
    if (!hexType) {
      throw new Error(
        `Aucun type d'hexagone trouvé sur l'hexagone à ${hexCoord.toString()}.`
      );
    }

    // Convertir en ResourceType
    const resourceType = this.hexTypeToResourceType(hexType);
    if (!resourceType) {
      throw new Error(
        `L'hexagone à ${hexCoord.toString()} ne contient pas de ressource récoltable.`
      );
    }

    // Calculer le gain
    const gain = this.calculateGain(hexType);
    
    if (gain > 0) {
      // Ajouter la ressource à l'inventaire
      playerResources.addResource(resourceType, gain);
    }

    return gain;
  }
}
