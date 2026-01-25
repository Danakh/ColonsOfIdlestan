import { IslandMap } from '../model/map/IslandMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { CityLevel } from '../model/city/CityLevel';
import { calculateCivilizationPoints } from '../model/game/CivilizationPoints';

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
      return 'Une capitale est requise pour activer le Prestige.';
    }

    const civilizationPoints = calculateCivilizationPoints(map, civId);
    if (civilizationPoints < 20) {
      return `${20 - civilizationPoints} points de civilisation supplémentaires requis (actuellement: ${civilizationPoints}).`;
    }

    return undefined;
  }

  /**
   * Active l'action Prestige et retourne les points de civilisation gagnés.
   * 
   * Les points de civilisation bonus sont basés sur le niveau de civilisation.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns Le résultat de l'action avec les points de civilisation gagnés
   */
  static activatePrestige(
    civId: CivilizationId,
    map: IslandMap,
    civPointMultiplier?: number
  ): PrestigeActionResult {
    // Vérifier les conditions
    if (!this.canActivatePrestige(civId, map)) {
      const reason = this.getPrestigeRestrictionReason(civId, map);
      return {
        success: false,
        message: reason || 'Les conditions pour activer le Prestige ne sont pas réunies.'
      };
    }

    // Points de prestige = points de civilisation
    const basePoints = calculateCivilizationPoints(map, civId);
    const multiplier = civPointMultiplier ?? 1;
    const prestigePoints = Math.floor(basePoints * multiplier);

    return {
      success: true,
      message: `Action Prestige activée! ${prestigePoints} points de civilisation obtenus.`,
      civilizationPointsGained: prestigePoints
    };
  }
}
