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
    const tradeRate = this.getTradeRateForResource(fromResource);
    if (!resources.hasEnough(fromResource, tradeRate)) {
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

      const tradeRate = this.getTradeRateForResource(fromResource);
      if (!resources.hasEnough(fromResource, tradeRate)) {
        throw new Error(
          `Pas assez de ${fromResource} pour effectuer l'échange. ` +
          `Requis: ${tradeRate}, disponible: ${resources.getResource(fromResource)}.`
        );
      }
    }

    // Retirer les ressources échangées
    const tradeRate = this.getTradeRateForResource(fromResource);
    resources.removeResource(fromResource, tradeRate);

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

  /**
   * Retourne le nombre de ressources requises pour un échange d'un type de ressource donné.
   * Actuellement, c'est 4 pour toutes les ressources, mais cette méthode permet
   * d'avoir des taux différents par ressource à l'avenir.
   * 
   * @param resourceType - Le type de ressource à échanger
   * @returns Le nombre de ressources requises pour un échange
   */
  static getTradeRateForResource(resourceType: ResourceType): number {
    // Pour l'instant, le taux est le même pour toutes les ressources
    return this.TRADE_RATE;
  }

  /**
   * Effectue plusieurs échanges en une seule transaction.
   * Valide que toutes les quantités offertes sont des multiples de 4
   * et que toutes les quantités demandées sont des multiples de 1.
   * 
   * @param offeredResources - Map des ressources offertes (quantités multiples de 4)
   * @param requestedResources - Map des ressources demandées (quantités multiples de 1)
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param playerResources - Les ressources du joueur
   * @throws Error si les quantités ne sont pas valides ou si l'échange n'est pas possible
   */
  static performBatchTrade(
    offeredResources: Map<ResourceType, number>,
    requestedResources: Map<ResourceType, number>,
    civId: CivilizationId,
    map: GameMap,
    playerResources: PlayerResources
  ): void {
    // Vérifier l'accès au commerce
    if (!this.canTrade(civId, map)) {
      throw new Error(
        'Le commerce n\'est pas disponible. ' +
        'Vous devez posséder au moins un port maritime (Seaport) dans une de vos villes.'
      );
    }

    // Valider que toutes les quantités offertes sont des multiples du taux d'échange pour cette ressource
    for (const [resourceType, quantity] of offeredResources.entries()) {
      if (quantity > 0) {
        const tradeRate = this.getTradeRateForResource(resourceType);
        if (quantity % tradeRate !== 0) {
          throw new Error(
            `La quantité offerte de ${resourceType} doit être un multiple de ${tradeRate}. ` +
            `Quantité actuelle: ${quantity}`
          );
        }
      }
    }

    // Valider que toutes les quantités demandées sont des multiples de 1
    for (const [resourceType, quantity] of requestedResources.entries()) {
      if (quantity > 0 && quantity % this.TRADE_RECEIVED !== 0) {
        throw new Error(
          `La quantité demandée de ${resourceType} doit être un multiple de ${this.TRADE_RECEIVED}. ` +
          `Quantité actuelle: ${quantity}`
        );
      }
    }

    // Vérifier que le joueur a assez de ressources pour toutes les offres
    for (const [resourceType, quantity] of offeredResources.entries()) {
      if (quantity > 0) {
        if (!playerResources.hasEnough(resourceType, quantity)) {
          throw new Error(
            `Pas assez de ${resourceType} pour effectuer l'échange. ` +
            `Requis: ${quantity}, disponible: ${playerResources.getResource(resourceType)}.`
          );
        }
      }
    }

    // Vérifier qu'au moins une ressource est offerte et une autre est demandée
    const hasOffered = Array.from(offeredResources.values()).some(qty => qty > 0);
    const hasRequested = Array.from(requestedResources.values()).some(qty => qty > 0);

    if (!hasOffered || !hasRequested) {
      throw new Error('Vous devez proposer au moins une ressource et en demander au moins une autre.');
    }

    // Créer des copies temporaires pour le calcul
    const remainingOffered = new Map(offeredResources);
    const remainingRequested = new Map(requestedResources);

    // Liste des échanges à effectuer
    const tradesToPerform: Array<{ from: ResourceType; to: ResourceType; count: number }> = [];

    // Calculer tous les échanges possibles
    // Pour chaque ressource demandée, on cherche des ressources offertes à échanger
    for (const [toResource, requestedQty] of remainingRequested.entries()) {
      if (requestedQty === 0) continue;

      let remainingToReceive = requestedQty;

      // Chercher des ressources offertes pour satisfaire cette demande
      for (const [fromResource, offeredQty] of remainingOffered.entries()) {
        if (remainingToReceive === 0) break;
        if (offeredQty === 0) continue;
        if (fromResource === toResource) continue; // Ne pas échanger contre la même ressource

        // Calculer combien d'échanges on peut faire avec cette ressource offerte
        const tradeRate = this.getTradeRateForResource(fromResource);
        const availableOffers = offeredQty / tradeRate;
        const neededExchanges = remainingToReceive / this.TRADE_RECEIVED;
        const exchangesToDo = Math.min(availableOffers, neededExchanges);

        if (exchangesToDo > 0) {
          tradesToPerform.push({
            from: fromResource,
            to: toResource,
            count: exchangesToDo,
          });

          // Mettre à jour les quantités restantes
          remainingToReceive -= exchangesToDo * this.TRADE_RECEIVED;
          const remainingOfferedQty = offeredQty - (exchangesToDo * tradeRate);
          remainingOffered.set(fromResource, remainingOfferedQty);
        }
      }

      // Si on n'a pas pu satisfaire toute la demande, c'est une erreur
      if (remainingToReceive > 0) {
        throw new Error(
          `Impossible de satisfaire la demande de ${toResource}. ` +
          `Manque ${remainingToReceive} unité(s). ` +
          `Pas assez de ressources offertes pour compléter l'échange.`
        );
      }
    }

    // Note : On permet que des ressources offertes restent non utilisées
    // si elles ne peuvent pas être échangées (pas assez de ressources demandées)
    // Cela permet plus de flexibilité dans la composition de l'échange

    // Effectuer tous les échanges validés
    for (const trade of tradesToPerform) {
      for (let i = 0; i < trade.count; i++) {
        this.performTrade(trade.from, trade.to, civId, map, playerResources);
      }
    }
  }
}
