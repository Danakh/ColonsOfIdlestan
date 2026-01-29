import { BaseBuildingSpec } from './BaseBuilding';
import { ResourceType } from '../../map/ResourceType';

export class LibrarySpec extends BaseBuildingSpec {
  getBuildCost(): Map<ResourceType, number> {
    return new Map([[ResourceType.Wood, 6], [ResourceType.Brick, 4], [ResourceType.Sheep, 10]]);
  }

  getUpgradeCost(currentLevel: number): Map<ResourceType, number> {
    const base = new Map([[ResourceType.Wood, 20], [ResourceType.Brick, 5], [ResourceType.Sheep, 30]]);
    const result = new Map<ResourceType, number>();
    for (const [r, c] of base) result.set(r, c * currentLevel);
    return result;
  }
}
