import { BaseBuildingSpec } from './BaseBuilding';
import { ResourceType } from '../../map/ResourceType';
import { HexType } from '../../map/HexType';

export class MillSpec extends BaseBuildingSpec {
  getBuildCost(): Map<ResourceType, number> {
    return new Map([[ResourceType.Wood, 2], [ResourceType.Brick, 5]]);
  }

  getUpgradeCost(currentLevel: number): Map<ResourceType, number> {
    const base = new Map([[ResourceType.Wood, 10], [ResourceType.Brick, 10], [ResourceType.Sheep, 10]]);
    const result = new Map<ResourceType, number>();
    for (const [r, c] of base) result.set(r, c * currentLevel);
    return result;
  }

  getRequiredHexType(_: string): HexType | null {
    return HexType.Wheat;
  }
}
