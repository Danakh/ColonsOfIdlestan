import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { PlayerResources } from '../model/game/PlayerResources';
import { ResourceType } from '../model/map/ResourceType';
import { BuildingType } from '../model/city/BuildingType';
import { calculateInventoryCapacity } from '../model/game/InventoryCapacity';

/**
 * Contrôleur pour gérer le commerce.
 *
 * Une civilisation peut échanger des ressources contre 1 de son choix si elle possède
 * au moins un port maritime (Seaport, 3:1) ou un marché (Market, 4:1) dans une de ses villes.
 */
export class TradeController {
  private static readonly TRADE_RATE_SEAPORT = 3;
  private static readonly TRADE_RATE_MARKET = 4;

  /**
   * Nombre de ressources reçues lors d'un échange.
   */
  private static readonly TRADE_RECEIVED = 1;

  /**
   * Vérifie si une civilisation a accès au commerce (port maritime ou marché).
   *
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si la civilisation a au moins un port maritime ou un marché
   */
  static canTrade(civId: CivilizationId, map: GameMap): boolean {
    const cities = map.getCitiesByCivilization(civId);
    for (const city of cities) {
      if (city.hasBuilding(BuildingType.Seaport) || city.hasBuilding(BuildingType.Market)) {
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
    const tradeRate = this.getTradeRateForCivilization(civId, map);
    if (!resources.hasEnough(fromResource, tradeRate)) {
      return false;
    }

    return true;
  }

  /**
   * Effectue un échange : X ressources identiques contre 1 ressource de choix (X = 3 avec port, 4 avec marché).
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
          'Vous devez posséder au moins un port maritime ou un marché dans une de vos villes.'
        );
      }

      if (fromResource === toResource) {
        throw new Error('Vous ne pouvez pas échanger une ressource contre elle-même.');
      }

      const tradeRate = this.getTradeRateForCivilization(civId, map);
      if (!resources.hasEnough(fromResource, tradeRate)) {
        throw new Error(
          `Pas assez de ${fromResource} pour effectuer l'échange. ` +
          `Requis: ${tradeRate}, disponible: ${resources.getResource(fromResource)}.`
        );
      }
    }

    // Retirer les ressources échangées
    const tradeRate = this.getTradeRateForCivilization(civId, map);
    resources.removeResource(fromResource, tradeRate);

    // Calculer la capacité d'inventaire maximale
    const maxCapacity = calculateInventoryCapacity(map, civId);
    
    // Ajouter la ressource reçue avec limitation de capacité
    resources.addResourceCapped(toResource, this.TRADE_RECEIVED, maxCapacity);
  }

  /**
   * Retourne le taux d'échange par défaut (4:1, marché).
   */
  static getTradeRate(): number {
    return this.TRADE_RATE_MARKET;
  }

  /**
   * Retourne le nombre de ressources reçues lors d'un échange.
   */
  static getTradeReceived(): number {
    return this.TRADE_RECEIVED;
  }

  /**
   * Retourne le taux d'échange pour une civilisation : 3 si elle a un port (Seaport), 4 si marché (Market) uniquement.
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns Le nombre de ressources à donner pour recevoir 1 (3 ou 4)
   */
  static getTradeRateForCivilization(civId: CivilizationId, map: GameMap): number {
    const cities = map.getCitiesByCivilization(civId);
    for (const city of cities) {
      if (city.hasBuilding(BuildingType.Seaport)) return this.TRADE_RATE_SEAPORT;
    }
    for (const city of cities) {
      if (city.hasBuilding(BuildingType.Market)) return this.TRADE_RATE_MARKET;
    }
    return this.TRADE_RATE_MARKET; // canTrade déjà vérifié en amont
  }

  /**
   * Effectue plusieurs échanges en une seule transaction.
   * Valide que les quantités offertes sont des multiples du taux (3 ou 4 selon port/marché)
   * et que les quantités demandées sont des multiples de 1.
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
        'Vous devez posséder au moins un port maritime ou un marché dans une de vos villes.'
      );
    }

    const tradeRate = this.getTradeRateForCivilization(civId, map);

    // Valider que toutes les quantités offertes sont des multiples du taux d'échange
    for (const [resourceType, quantity] of offeredResources.entries()) {
      if (quantity > 0 && quantity % tradeRate !== 0) {
        throw new Error(
          `La quantité offerte de ${resourceType} doit être un multiple de ${tradeRate}. ` +
          `Quantité actuelle: ${quantity}`
        );
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
