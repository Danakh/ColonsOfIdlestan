import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { PlayerResources } from '../model/game/PlayerResources';
import { ResourceType } from '../model/map/ResourceType';
import { BuildingType } from '../model/city/BuildingType';

/**
 * Contrôleur pour gérer le commerce maritime.
 * 
 * Une civilisation peut échanger 4 ressources identiques contre 1 ressource de son choix
 * si elle possède au moins un port maritime (Seaport) dans une de ses villes.
 */
export class TradeController {
  /**
   * Nombre de ressources requises pour un échange.
   */
  private static readonly TRADE_RATE = 4;

  /**
   * Nombre de ressources reçues lors d'un échange.
   */
  private static readonly TRADE_RECEIVED = 1;

  /**
   * Vérifie si une civilisation a accès au commerce (possède un port maritime).
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si la civilisation a au moins un port maritime
   */
  static canTrade(civId: CivilizationId, map: GameMap): boolean {
    // Obtenir toutes les villes de cette civilisation
    const cities = map.getCitiesByCivilization(civId);

    // Vérifier si au moins une ville a un port maritime
    for (const city of cities) {
      if (city.hasBuilding(BuildingType.Seaport)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Vérifie si un échange est possible.
   * Vérifie à la fois l'accès au commerce et les ressources disponibles.
   * 
   * @param fromResource - La ressource à échanger (4 unités)
   * @param toResource - La ressource à recevoir (1 unité)
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @returns true si l'échange est possible
   */
  static canPerformTrade(
    fromResource: ResourceType,
    toResource: ResourceType,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources
  ): boolean {
    // Vérifier l'accès au commerce
    if (!this.canTrade(civId, map)) {
      return false;
    }

    // Vérifier que les ressources sont différentes
    if (fromResource === toResource) {
      return false;
    }

    // Vérifier que le joueur a assez de ressources à échanger
    if (!resources.hasEnough(fromResource, this.TRADE_RATE)) {
      return false;
    }

    return true;
  }

  /**
   * Effectue un échange : 4 ressources identiques contre 1 ressource de choix.
   * 
   * @param fromResource - La ressource à échanger (4 unités)
   * @param toResource - La ressource à recevoir (1 unité)
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @throws Error si l'échange n'est pas possible
   */
  static performTrade(
    fromResource: ResourceType,
    toResource: ResourceType,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources
  ): void {
    // Vérifier que l'échange est possible
    if (!this.canPerformTrade(fromResource, toResource, civId, map, resources)) {
      if (!this.canTrade(civId, map)) {
        throw new Error(
          'Le commerce n\'est pas disponible. ' +
          'Vous devez posséder au moins un port maritime (Seaport) dans une de vos villes.'
        );
      }

      if (fromResource === toResource) {
        throw new Error('Vous ne pouvez pas échanger une ressource contre elle-même.');
      }

      if (!resources.hasEnough(fromResource, this.TRADE_RATE)) {
        throw new Error(
          `Pas assez de ${fromResource} pour effectuer l'échange. ` +
          `Requis: ${this.TRADE_RATE}, disponible: ${resources.getResource(fromResource)}.`
        );
      }
    }

    // Retirer les ressources échangées
    resources.removeResource(fromResource, this.TRADE_RATE);

    // Ajouter la ressource reçue
    resources.addResource(toResource, this.TRADE_RECEIVED);
  }

  /**
   * Retourne le taux d'échange (nombre de ressources requises).
   * @returns Le taux d'échange
   */
  static getTradeRate(): number {
    return this.TRADE_RATE;
  }

  /**
   * Retourne le nombre de ressources reçues lors d'un échange.
   * @returns Le nombre de ressources reçues
   */
  static getTradeReceived(): number {
    return this.TRADE_RECEIVED;
  }
}
