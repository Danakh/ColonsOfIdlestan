import { BaseBuildingSpec } from './BaseBuilding';
import { ResourceType } from '../../map/ResourceType';
import { HexType } from '../../map/HexType';

export class SeaportSpec extends BaseBuildingSpec {
  getBuildCost(): Map<ResourceType, number> {
    return new Map([[ResourceType.Ore, 20], [ResourceType.Wood, 30], [ResourceType.Brick, 10]]);
  }

  getUpgradeCost(currentLevel: number): Map<ResourceType, number> {
    const base = new Map([[ResourceType.Ore, 20], [ResourceType.Wood, 20], [ResourceType.Brick, 10], [ResourceType.Sheep, 10]]);
    const result = new Map<ResourceType, number>();
    for (const [r, c] of base) result.set(r, c * currentLevel);
    return result;
  }

  getRequiredHexType(_: string): HexType | null {
    return HexType.Water;
  }
}
