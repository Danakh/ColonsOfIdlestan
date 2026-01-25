import { HexCoord } from '../model/hex/HexCoord';
import { Vertex } from '../model/hex/Vertex';
import { IslandMap } from '../model/map/IslandMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { PlayerResources } from '../model/game/PlayerResources';
import { ResourceHarvest } from '../model/game/ResourceHarvest';
import { GameClock } from '../model/game/GameClock';
import { TradeController } from './TradeController';
import { ResourceType } from '../model/map/ResourceType';

/**
 * Résultat d'une tentative de récolte.
 */
export interface HarvestResult {
  /** Indique si la récolte a réussi */
  success: boolean;
  /** Temps restant avant le prochain harvest possible (en millisecondes) */
  remainingTimeMs: number;
  /** Ville qui a permis la récolte (null si la récolte a échoué) */
  cityVertex: Vertex | null;
}

/**
 * Contrôleur pour gérer la récolte de ressources avec limitation de taux.
 * 
 * Cette classe orchestre la logique de récolte en coordonnant
 * les vérifications métier (ResourceHarvest) avec la limitation
 * de taux (rate limiting) pour éviter les clics trop rapides.
 */
export class ResourceHarvestController {
  private static hexCooldowns: Map<string, number> = new Map(); // Map<hexCoord.hashCode(), lastHarvestTime en secondes>
  private static readonly MIN_HARVEST_INTERVAL_S = 2;

  /**
   * Intervalle actuel entre deux récoltes manuelles (en secondes).
   *
   * Centralisé ici pour que l'UI (renderer) et les tests puissent
   * le récupérer dynamiquement (ex: futur upgrade qui réduit ce délai).
   */
  static getHarvestIntervalSeconds(): number {
    return ResourceHarvestController.MIN_HARVEST_INTERVAL_S;
  }

  /**
   * Intervalle actuel entre deux récoltes manuelles (en millisecondes).
   */
  static getHarvestIntervalMs(): number {
    return ResourceHarvestController.getHarvestIntervalSeconds() * 1000;
  }

  /**
   * Récolte une ressource d'un hexagone pour une civilisation donnée.
   * Applique une limitation de taux de 1 récolte toutes les 2 secondes maximum par hex.
   *
   * @param hexCoord - La coordonnée de l'hexagone à récolter
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param options - Optionnel : { gameClock } pour piloter le temps (tests). Sans options, utilise Date.now()/1000.
   * @returns Un objet indiquant le succès de la récolte et le temps restant
   */
  static harvest(
    hexCoord: HexCoord,
    civId: CivilizationId,
    map: IslandMap,
    resources: PlayerResources,
    options?: { gameClock?: GameClock; resourceMultiplier?: number }
  ): HarvestResult {
    const hexKey = hexCoord.hashCode();
    const lastHarvestTime = ResourceHarvestController.hexCooldowns.get(hexKey);
    const now = options?.gameClock ? options.gameClock.getCurrentTime() : Date.now() / 1000;
    const timeSinceLastHarvest = now - (lastHarvestTime ?? 0);

    // Si première récolte sur cet hex (lastHarvestTime === undefined), pas de blocage. Sinon vérifier le cooldown.
    const harvestIntervalSeconds = ResourceHarvestController.getHarvestIntervalSeconds();
    if (lastHarvestTime !== undefined && timeSinceLastHarvest < harvestIntervalSeconds) {
      const remainingTimeMs =
        Math.max(0, harvestIntervalSeconds - timeSinceLastHarvest) * 1000;
      return {
        success: false,
        remainingTimeMs,
        cityVertex: null,
      };
    }

    // Vérifier que la récolte est possible
    if (!ResourceHarvest.canHarvest(hexCoord, map, civId)) {
      return {
        success: false,
        remainingTimeMs: 0, // Pas de limitation si la récolte n'est pas possible pour d'autres raisons
        cityVertex: null,
      };
    }

    // Effectuer la récolte et obtenir la ville
    const harvestResult = ResourceHarvest.harvest(
      hexCoord,
      map,
      civId,
      resources,
      undefined,
      options?.resourceMultiplier
    );

    // Si la capacité maximale a été atteinte et qu'une ressource a été récoltée, notifier TradeController
    if (harvestResult.capacityReached && harvestResult.resourceType !== null) {
      TradeController.handleAutoTrade(harvestResult.resourceType, civId, map, resources);
    }

    // Mettre à jour le timestamp de la dernière récolte pour cet hex (en secondes)
    ResourceHarvestController.hexCooldowns.set(hexKey, now);

    return {
      success: true,
      remainingTimeMs: ResourceHarvestController.getHarvestIntervalMs(),
      cityVertex: harvestResult.cityVertex,
    };
  }

  /**
   * Retourne le temps restant avant qu'un hexagone puisse être récolté à nouveau.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param options - Optionnel : { gameClock } pour piloter le temps (tests). Sans options, utilise Date.now()/1000.
   * @returns Le temps restant en millisecondes (0 si prêt à récolter)
   */
  static getRemainingCooldown(hexCoord: HexCoord, options?: { gameClock?: GameClock }): number {
    const hexKey = hexCoord.hashCode();
    const last = ResourceHarvestController.hexCooldowns.get(hexKey);
    if (last === undefined) {
      return 0;
    }
    const now = options?.gameClock ? options.gameClock.getCurrentTime() : Date.now() / 1000;
    return Math.max(0, ResourceHarvestController.getHarvestIntervalSeconds() - (now - last)) * 1000;
  }

  /**
   * Réinitialise tous les cooldowns. Utile pour les tests.
   */
  static resetCooldowns(): void {
    ResourceHarvestController.hexCooldowns.clear();
  }
}
