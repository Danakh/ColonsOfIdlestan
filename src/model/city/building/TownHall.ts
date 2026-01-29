import { BaseBuildingSpec } from './BaseBuilding';
import { ResourceType } from '../../map/ResourceType';

export class TownHallSpec extends BaseBuildingSpec {
  getBuildCost(): Map<ResourceType, number> {
    return new Map([[ResourceType.Wood, 5], [ResourceType.Brick, 5], [ResourceType.Ore, 1]]);
  }

  getUpgradeCost(currentLevel: number): Map<ResourceType, number> {
    const base = new Map([[ResourceType.Wood, 4], [ResourceType.Brick, 4], [ResourceType.Ore, 2], [ResourceType.Wheat, 2]]);
    const result = new Map<ResourceType, number>();
    for (const [r, c] of base) result.set(r, c * currentLevel);
    return result;
  }

  getAction(_: string): string | null {
    return 'Upgrade';
  }
}
