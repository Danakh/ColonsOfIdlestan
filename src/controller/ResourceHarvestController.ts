import { HexCoord } from '../model/hex/HexCoord';
import { Vertex } from '../model/hex/Vertex';
import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { PlayerResources } from '../model/game/PlayerResources';
import { ResourceHarvest } from '../model/game/ResourceHarvest';

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
  private static hexCooldowns: Map<string, number> = new Map(); // Map<hexCoord.hashCode(), timestamp>
  private static readonly MIN_HARVEST_INTERVAL_MS = 1000; // 1 seconde

  /**
   * Récolte une ressource d'un hexagone pour une civilisation donnée.
   * Applique une limitation de taux de 1 récolte par seconde maximum par hex.
   * 
   * @param hexCoord - La coordonnée de l'hexagone à récolter
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @returns Un objet indiquant le succès de la récolte et le temps restant
   */
  static harvest(
    hexCoord: HexCoord,
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources
  ): HarvestResult {
    const hexKey = hexCoord.hashCode();
    const lastHarvestTime = ResourceHarvestController.hexCooldowns.get(hexKey);
    
    // Si un timestamp existe, vérifier le cooldown
    if (lastHarvestTime !== undefined) {
      const now = Date.now();
      const timeSinceLastHarvest = now - lastHarvestTime;
      const remainingTime = Math.max(0, ResourceHarvestController.MIN_HARVEST_INTERVAL_MS - timeSinceLastHarvest);
      
      // Vérifier la limitation de taux (1 clic par seconde par hex)
      if (timeSinceLastHarvest < ResourceHarvestController.MIN_HARVEST_INTERVAL_MS) {
        return {
          success: false,
          remainingTimeMs: remainingTime,
          cityVertex: null,
        };
      }
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
    const harvestResult = ResourceHarvest.harvest(hexCoord, map, civId, resources);
    
    // Mettre à jour le timestamp de la dernière récolte pour cet hex
    const now = Date.now();
    ResourceHarvestController.hexCooldowns.set(hexKey, now);
    
    // Prochain harvest possible dans MIN_HARVEST_INTERVAL_MS
    return {
      success: true,
      remainingTimeMs: ResourceHarvestController.MIN_HARVEST_INTERVAL_MS,
      cityVertex: harvestResult.cityVertex,
    };
  }

  /**
   * Retourne le temps restant avant qu'un hexagone puisse être récolté à nouveau.
   * @param hexCoord - La coordonnée de l'hexagone
   * @returns Le temps restant en millisecondes (0 si prêt à récolter)
   */
  static getRemainingCooldown(hexCoord: HexCoord): number {
    const hexKey = hexCoord.hashCode();
    const lastHarvestTime = ResourceHarvestController.hexCooldowns.get(hexKey);
    if (lastHarvestTime === undefined) {
      return 0;
    }
    const now = Date.now();
    const timeSinceLastHarvest = now - lastHarvestTime;
    return Math.max(0, ResourceHarvestController.MIN_HARVEST_INTERVAL_MS - timeSinceLastHarvest);
  }

  /**
   * Réinitialise tous les cooldowns. Utile pour les tests.
   */
  static resetCooldowns(): void {
    ResourceHarvestController.hexCooldowns.clear();
  }
}
