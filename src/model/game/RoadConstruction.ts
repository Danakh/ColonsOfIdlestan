import { Edge } from '../hex/Edge';
import { GameMap } from '../map/GameMap';
import { CivilizationId } from '../map/CivilizationId';
import { ResourceType } from '../map/ResourceType';
import { PlayerResources } from './PlayerResources';

/**
 * Gère la logique de construction de routes.
 * 
 * Une route peut être construite sur un edge si :
 * - L'edge touche une ville de la même civilisation
 * - OU l'edge touche une autre route de la même civilisation
 * 
 * Le coût de construction est : 1 argile (Brick) + 1 bois (Wood).
 */
export class RoadConstruction {
  private static readonly COST = new Map<ResourceType, number>([
    [ResourceType.Brick, 1],
    [ResourceType.Wood, 1],
  ]);

  /**
   * Vérifie si un edge peut être construit par une civilisation donnée.
   * @param edge - L'arête à construire
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si l'edge peut être construit
   */
  static canBuildRoad(edge: Edge, civId: CivilizationId, map: GameMap): boolean {
    // Vérifier que la civilisation est enregistrée
    if (!map.isCivilizationRegistered(civId)) {
      return false;
    }

    // Vérifier qu'il n'y a pas déjà une route sur cet edge
    if (map.hasRoad(edge)) {
      return false;
    }

    // Vérifier si l'edge touche une ville de la même civilisation
    const vertices = map.getVerticesForEdge(edge);
    for (const vertex of vertices) {
      if (map.hasCity(vertex)) {
        const owner = map.getCityOwner(vertex);
        if (owner && owner.equals(civId)) {
          return true;
        }
      }
    }

    // Vérifier si l'edge touche une autre route de la même civilisation
    const adjacentEdges = this.getAdjacentEdges(edge, map);
    for (const adjacentEdge of adjacentEdges) {
      if (map.hasRoad(adjacentEdge)) {
        const owner = map.getRoadOwner(adjacentEdge);
        if (owner && owner.equals(civId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Vérifie si le joueur a assez de ressources pour construire une route.
   * @param resources - Les ressources du joueur
   * @param distance - La distance à la ville (optionnel, pour vérifier le coût réel)
   * @returns true si le joueur a assez de ressources
   */
  static canAfford(resources: PlayerResources, distance?: number): boolean {
    const cost = RoadConstruction.getCost(distance);
    return resources.canAfford(cost);
  }

  /**
   * Retourne le coût de construction d'une route.
   * Le coût de base est multiplié par 2^distance.
   * @param distance - La distance à la ville la plus proche (optionnel, défaut = 0 pour coût de base)
   * @returns Le coût sous forme de Map
   */
  static getCost(distance?: number): Map<ResourceType, number> {
    const multiplier = distance !== undefined ? Math.pow(2, distance) : 1;
    const cost = new Map<ResourceType, number>();
    
    for (const [resourceType, baseAmount] of RoadConstruction.COST.entries()) {
      cost.set(resourceType, baseAmount * multiplier);
    }
    
    return cost;
  }

  /**
   * Retourne les edges adjacents à un edge donné.
   * Deux edges sont adjacents s'ils partagent un vertex.
   * @param edge - L'arête pour laquelle trouver les edges adjacents
   * @param map - La carte de jeu
   * @returns Un tableau des edges adjacents à cette arête
   */
  private static getAdjacentEdges(edge: Edge, map: GameMap): Edge[] {
    const adjacentEdges: Edge[] = [];
    const vertices = map.getVerticesForEdge(edge);

    // Pour chaque vertex adjacent à l'edge, obtenir tous les edges qui touchent ce vertex
    for (const vertex of vertices) {
      const hexes = vertex.getHexes();
      // Un vertex est formé de 3 hexagones, donc il y a 3 edges possibles entre ces hexagones
      for (let i = 0; i < hexes.length; i++) {
        for (let j = i + 1; j < hexes.length; j++) {
          try {
            const adjacentEdge = Edge.create(hexes[i], hexes[j]);
            // Ne pas inclure l'edge original
            if (!adjacentEdge.equals(edge)) {
              // Éviter les doublons
              if (!adjacentEdges.some(e => e.equals(adjacentEdge))) {
                adjacentEdges.push(adjacentEdge);
              }
            }
          } catch (e) {
            // Ignorer les edges invalides
          }
        }
      }
    }

    return adjacentEdges;
  }
}
