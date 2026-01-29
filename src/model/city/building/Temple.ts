import { BaseBuildingSpec } from './BaseBuilding';
import { ResourceType } from '../../map/ResourceType';

export class TempleSpec extends BaseBuildingSpec {
  getBuildCost(): Map<ResourceType, number> {
    return new Map([[ResourceType.Wood, 8], [ResourceType.Brick, 10], [ResourceType.Ore, 5], [ResourceType.Wheat, 10]]);
  }

  getUpgradeCost(currentLevel: number): Map<ResourceType, number> {
    const base = new Map([[ResourceType.Wood, 10], [ResourceType.Brick, 10], [ResourceType.Ore, 10], [ResourceType.Wheat, 50], [ResourceType.Sheep, 50]]);
    const result = new Map<ResourceType, number>();
    for (const [r, c] of base) result.set(r, c * currentLevel);
    return result;
  }
}
