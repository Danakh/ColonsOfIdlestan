import { CivilizationState } from '../model/game/CivilizationState';
import { CivilizationId } from '../model/map/CivilizationId';

/** Controller to handle purchasing civilization upgrades using civilization points. */
export class CivilizationUpgradeController {
  // Costs
  static resourceGainCostForLevel(currentLevel: number): number {
    return (currentLevel + 1);
  }

  static civPointGainCostForLevel(currentLevel: number): number {
    return 10 * Math.pow(currentLevel + 1, 2);
  }

  static constructionTimeCostForLevel(currentLevel: number): number {
    return 5 * (currentLevel + 1);
  }

  static purchaseResourceGainLevel(civState: CivilizationState, civId: CivilizationId): boolean {
    const islandState = civState.getIslandState();
    const civ = islandState.getCivilization(civId);
    const current = civ.getResourceGainLevel();
    if (current >= 100) return false;
    const cost = CivilizationUpgradeController.resourceGainCostForLevel(current);
    if (civState.getCivilizationPoints() < cost) return false;
    civState.setCivilizationPoints(civState.getCivilizationPoints() - cost);
    civ.incrementResourceGainLevel();
    return true;
  }

  static purchaseCivPointGainLevel(civState: CivilizationState, civId: CivilizationId): boolean {
    const islandState = civState.getIslandState();
    const civ = islandState.getCivilization(civId);
    const current = civ.getCivPointGainLevel();
    if (current >= 10) return false;
    const cost = CivilizationUpgradeController.civPointGainCostForLevel(current);
    if (civState.getCivilizationPoints() < cost) return false;
    civState.setCivilizationPoints(civState.getCivilizationPoints() - cost);
    civ.incrementCivPointGainLevel();
    return true;
  }

  static purchaseConstructionTimeLevel(civState: CivilizationState, civId: CivilizationId): boolean {
    const islandState = civState.getIslandState();
    const civ = islandState.getCivilization(civId);
    const current = civ.getConstructionTimeLevel();
    if (current >= 10) return false;
    const cost = CivilizationUpgradeController.constructionTimeCostForLevel(current);
    if (civState.getCivilizationPoints() < cost) return false;
    civState.setCivilizationPoints(civState.getCivilizationPoints() - cost);
    civ.incrementConstructionTimeLevel();
    return true;
  }
}
