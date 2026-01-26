import { IslandMap } from '../model/map/IslandMap';
import { IslandState } from '../model/game/IslandState';
import { CivilizationState } from '../model/game/CivilizationState';
import { CivilizationId } from '../model/map/CivilizationId';
import { CityLevel } from '../model/city/CityLevel';
import { calculateCivilizationPoints } from '../model/game/CivilizationPoints';
import { localize } from '../i18n';

/**
 * Résultat de l'activation de l'action Prestige du port maritime niveau 4.
 */
export interface PrestigeActionResult {
  success: boolean;
  message: string;
  civilizationPointsGained?: number;
}

/**
 * Contrôleur pour gérer l'action Prestige du port maritime niveau 4.
 * 
 * L'action Prestige peut être activée seulement si:
 * 1. Une capitale existe dans la civilisation
 * 2. La civilisation a 20+ points de civilisation
 * 
 * Quand activée, l'action Prestige octroie des ressources bonus basées sur le commerce.
 */
export class PrestigeController {
  /**
   * Vérifie si l'action Prestige peut être activée.
   * Conditions:
   * - Une capitale doit exister
   * - 20+ points de civilisation requis
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si l'action peut être activée
   */
  static canActivatePrestige(civId: CivilizationId, map: IslandMap): boolean {
    // Vérifier qu'une capitale existe
    const cities = map.getCitiesByCivilization(civId);
    const hasCapital = cities.some(city => city.level === CityLevel.Capital);
    
    if (!hasCapital) {
      return false;
    }

    // Vérifier qu'il y a au moins 20 points de civilisation
    const civilizationPoints = calculateCivilizationPoints(map, civId);
    return civilizationPoints >= 20;
  }

  /**
   * Retourne un message expliquant pourquoi l'action Prestige ne peut pas être activée.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns Un message d'explication ou undefined si l'action peut être activée
   */
  static getPrestigeRestrictionReason(civId: CivilizationId, map: IslandMap): string | undefined {
    const cities = map.getCitiesByCivilization(civId);
    const hasCapital = cities.some(city => city.level === CityLevel.Capital);
    
    if (!hasCapital) {
      return localize('prestige.reason.noCapital');
    }

    const civilizationPoints = calculateCivilizationPoints(map, civId);
    if (civilizationPoints < 20) {
      return localize('prestige.reason.notEnough', { needed: String(20 - civilizationPoints), current: String(civilizationPoints) });
    }

    return undefined;
  }

  /**
   * Calcule le gain de prestige potentiel sans effectuer le prestige.
   * 
   * @param civState - L'état de la civilisation
   * @returns Le résultat avec les points de civilisation qui seraient gagnés
   */
  static calculatePrestigeGain(civState: CivilizationState): PrestigeActionResult {
    const islandState = civState.getIslandState();
    const map = islandState.getIslandMap();
    const civId = islandState.getPlayerCivilizationId();
    
    if (!map) {
      return {
        success: false,
        message: localize('error.mapUnavailable')
      };
    }

    // Vérifier les conditions
    if (!this.canActivatePrestige(civId, map)) {
      const reason = this.getPrestigeRestrictionReason(civId, map);
      return {
        success: false,
        message: reason || localize('prestige.restrictionsNotMet')
      };
    }

    // Récupérer le multiplicateur depuis la civilisation
    const civ = islandState.getCivilization(civId);
    const multiplier = civ.getCivPointGainMultiplier();

    // Points de prestige = points de civilisation * multiplicateur
    const basePoints = calculateCivilizationPoints(map, civId);
    const prestigePoints = Math.floor(basePoints * multiplier);

    return {
      success: true,
      message: localize('prestige.activated', { points: String(prestigePoints) }),
      civilizationPointsGained: prestigePoints
    };
  }

  /**
   * Active l'action Prestige : ajoute les points de civilisation gagnés et détruit l'IslandState.
   * Cette fonction doit être appelée après confirmation de l'utilisateur.
   * 
   * @param civState - L'état de la civilisation contenant l'IslandState actuelle
   * @returns Le résultat de l'action avec les points de civilisation gagnés
   */
  static activatePrestige(civState: CivilizationState): PrestigeActionResult {
    // Calculer d'abord le gain
    const result = this.calculatePrestigeGain(civState);
    
    if (!result.success || result.civilizationPointsGained === undefined) {
      return result;
    }

    // Ajouter les points de prestige
    civState.addPrestigePoints(result.civilizationPointsGained);

    // Détruire l'IslandState interne (réinitialiser la carte)
    const islandState = civState.getIslandState();
    islandState.setIslandMap(null);

    return result;
  }
}
