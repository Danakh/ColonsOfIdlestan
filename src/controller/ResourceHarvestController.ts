import { HexCoord } from '../model/hex/HexCoord';
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
}

/**
 * Contrôleur pour gérer la récolte de ressources avec limitation de taux.
 * 
 * Cette classe orchestre la logique de récolte en coordonnant
 * les vérifications métier (ResourceHarvest) avec la limitation
 * de taux (rate limiting) pour éviter les clics trop rapides.
 */
export class ResourceHarvestController {
  private static lastHarvestTime: number = 0;
  private static readonly MIN_HARVEST_INTERVAL_MS = 1000; // 1 seconde

  /**
   * Récolte une ressource d'un hexagone pour une civilisation donnée.
   * Applique une limitation de taux de 1 récolte par seconde maximum.
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
    const now = Date.now();
    const timeSinceLastHarvest = now - ResourceHarvestController.lastHarvestTime;
    const remainingTime = Math.max(0, ResourceHarvestController.MIN_HARVEST_INTERVAL_MS - timeSinceLastHarvest);
    
    // Vérifier la limitation de taux (1 clic par seconde)
    if (timeSinceLastHarvest < ResourceHarvestController.MIN_HARVEST_INTERVAL_MS) {
      return {
        success: false,
        remainingTimeMs: remainingTime,
      };
    }

    // Vérifier que la récolte est possible
    if (!ResourceHarvest.canHarvest(hexCoord, map, civId)) {
      return {
        success: false,
        remainingTimeMs: 0, // Pas de limitation si la récolte n'est pas possible pour d'autres raisons
      };
    }

    // Effectuer la récolte
    ResourceHarvest.harvest(hexCoord, map, civId, resources);
    
    // Mettre à jour le timestamp de la dernière récolte
    ResourceHarvestController.lastHarvestTime = now;
    
    // Prochain harvest possible dans MIN_HARVEST_INTERVAL_MS
    return {
      success: true,
      remainingTimeMs: ResourceHarvestController.MIN_HARVEST_INTERVAL_MS,
    };
  }
}
