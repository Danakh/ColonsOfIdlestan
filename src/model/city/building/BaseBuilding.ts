import { ResourceType } from '../../map/ResourceType';
import { HexType } from '../../map/HexType';
import { localize } from '../../../i18n';

export abstract class BaseBuildingSpec {
  abstract getBuildCost(): Map<ResourceType, number>;
  abstract getUpgradeCost(currentLevel: number): Map<ResourceType, number>;
  // Default localized name for a building. Uses a predictable localization
  // key derived from the building type when a subclass doesn't override it.
  getName(buildingType: string): string {
    const key = 'building.' + buildingType.charAt(0).toLowerCase() + buildingType.slice(1);
    return localize(key);
  }

  // Default required hex type mapping for production buildings.
  // Subclasses should override when they require a specific hex type.
  getRequiredHexType(_buildingType: string): HexType | null {
    return null;
  }

  // Return the action name key for a building action. Subclasses should
  // override to expose actions (e.g. TownHall -> 'Upgrade').
  getAction(_buildingType: string): string | null {
    return null;
  }

  // Localize building action names by string identifier using a predictable
  // localization key when not overridden.
  getActionName(action: string): string {
    const key = 'buildingAction.' + action.charAt(0).toLowerCase() + action.slice(1);
    return localize(key);
  }

  // Default localized description for a building. Subclasses may override
  // for custom descriptions.
  getDescription(buildingType: string): string {
    const key = 'building.desc.' + buildingType.charAt(0).toLowerCase() + buildingType.slice(1);
    return localize(key);
  }
}
