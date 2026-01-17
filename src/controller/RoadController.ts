import { Edge } from '../model/hex/Edge';
import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { ResourceType } from '../model/map/ResourceType';
import { PlayerResources } from '../model/game/PlayerResources';
import { RoadConstruction } from '../model/game/RoadConstruction';

/**
 * Contrôleur pour gérer la construction de routes avec consommation de ressources.
 * 
 * Cette classe orchestre la logique de construction de routes en coordonnant
 * les vérifications métier (RoadConstruction) avec la consommation de ressources.
 */
export class RoadController {
  /**
   * Construit une route sur un edge pour une civilisation donnée.
   * Vérifie les conditions de construction et consomme les ressources nécessaires.
   * 
   * @param edge - L'arête où construire la route
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @throws Error si la construction n'est pas possible ou si les ressources sont insuffisantes
   */
  static buildRoad(
    edge: Edge,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources
  ): void {
    // Vérifier que la construction est possible
    if (!RoadConstruction.canBuildRoad(edge, civId, map)) {
      throw new Error(
        `La route ne peut pas être construite sur l'arête ${edge.toString()}. ` +
        `L'arête doit toucher une ville ou une autre route de la même civilisation.`
      );
    }

    // Vérifier que le joueur a assez de ressources
    if (!RoadConstruction.canAfford(resources)) {
      throw new Error(
        `Pas assez de ressources pour construire une route. ` +
        `Requis: 1 ${ResourceType.Brick} et 1 ${ResourceType.Wood}.`
      );
    }

    // Retirer les ressources
    const cost = RoadConstruction.getCost();
    resources.payCost(cost);

    // Ajouter la route sur la carte
    map.addRoad(edge, civId);
  }
}
