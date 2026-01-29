import { BaseBuildingSpec } from './BaseBuilding';
import { ResourceType } from '../../map/ResourceType';

export class BuildersGuildSpec extends BaseBuildingSpec {
  getBuildCost(): Map<ResourceType, number> {
    return new Map([[ResourceType.Brick, 15], [ResourceType.Ore, 15], [ResourceType.Sheep, 10], [ResourceType.Wheat, 10]]);
  }

  getUpgradeCost(currentLevel: number): Map<ResourceType, number> {
    const base = new Map([[ResourceType.Brick, 10], [ResourceType.Ore, 10], [ResourceType.Sheep, 10], [ResourceType.Wheat, 10]]);
    const result = new Map<ResourceType, number>();
    for (const [r, c] of base) result.set(r, c * currentLevel);
    return result;
  }

  getAction(_: string): string | null {
    return 'Automation';
  }
}
