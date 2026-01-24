import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { City } from '../model/city/City';
import { PlayerResources } from '../model/game/PlayerResources';
import { CityLevel } from '../model/city/CityLevel';
import { calculateCivilizationPoints } from '../model/game/CivilizationPoints';

/**
 * Résultat de l'activation de l'action Prestige du port maritime niveau 4.
 */
export interface PrestigeActionResult {
  success: boolean;
  message: string;
  resourcesGained?: Map<string, number>;
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
  static canActivatePrestige(civId: CivilizationId, map: GameMap): boolean {
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
  static getPrestigeRestrictionReason(civId: CivilizationId, map: GameMap): string | undefined {
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
   * Active l'action Prestige et octroie des ressources bonus.
   * 
   * Les ressources bonus sont basées sur le nombre de ports et le niveau de civilisation.
   * Bonus: (nombre de ports * 10) + (points de civilisation - 20) ressources aléatoires
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param playerResources - Les ressources actuelles du joueur
   * @returns Le résultat de l'action
   */
  static activatePrestige(
    civId: CivilizationId,
    map: GameMap,
    playerResources: PlayerResources
  ): PrestigeActionResult {
    // Vérifier les conditions
    if (!this.canActivatePrestige(civId, map)) {
      const reason = this.getPrestigeRestrictionReason(civId, map);
      return {
        success: false,
        message: reason || 'Les conditions pour activer le Prestige ne sont pas réunies.'
      };
    }

    // Calculer les ressources bonus
    const cities = map.getCitiesByCivilization(civId);
    
    // Nombre de ports = nombre de villes avec un port maritime
    let seaportCount = 0;
    for (const city of cities) {
      if (city.hasBuilding('Seaport' as any)) {
        seaportCount++;
      }
    }

    // Points de prestige = (nombre de ports * 10) + (points de civilisation - 20)
    const civilizationPoints = calculateCivilizationPoints(map, civId);
    const prestigeBonus = (seaportCount * 10) + (civilizationPoints - 20);

    // Distribuer les ressources bonus de manière équilibrée
    const resourcesGained = new Map<string, number>();
    const baseGain = Math.floor(prestigeBonus / 4);
    const remainder = prestigeBonus % 4;

    // Distribuer aux ressources de manière proportionnelle
    resourcesGained.set('Ore', baseGain + (remainder > 0 ? 1 : 0));
    resourcesGained.set('Wood', baseGain + (remainder > 1 ? 1 : 0));
    resourcesGained.set('Brick', baseGain + (remainder > 2 ? 1 : 0));
    resourcesGained.set('Wheat', baseGain);

    return {
      success: true,
      message: `Action Prestige activée! ${prestigeBonus} ressources de prestige obtenues.`,
      resourcesGained
    };
  }
}
