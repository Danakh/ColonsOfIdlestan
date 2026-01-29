import { BaseBuildingSpec } from './BaseBuilding';
import { SawmillSpec } from './Sawmill';
import { BrickworksSpec } from './Brickworks';
import { MillSpec } from './Mill';
import { SheepfoldSpec } from './Sheepfold';
import { MineSpec } from './Mine';
import { SeaportSpec } from './Seaport';
import { MarketSpec } from './Market';
import { TownHallSpec } from './TownHall';
import { WarehouseSpec } from './Warehouse';
import { ForgeSpec } from './Forge';
import { LibrarySpec } from './Library';
import { TempleSpec } from './Temple';
import { BuildersGuildSpec } from './BuildersGuild';

export function createBuildingSpec(buildingType: string): BaseBuildingSpec {
  switch (buildingType) {
    case 'Sawmill':
      return new SawmillSpec();
    case 'Brickworks':
      return new BrickworksSpec();
    case 'Mill':
      return new MillSpec();
    case 'Sheepfold':
      return new SheepfoldSpec();
    case 'Mine':
      return new MineSpec();
    case 'Seaport':
      return new SeaportSpec();
    case 'Market':
      return new MarketSpec();
    case 'TownHall':
      return new TownHallSpec();
    case 'Warehouse':
      return new WarehouseSpec();
    case 'Forge':
      return new ForgeSpec();
    case 'Library':
      return new LibrarySpec();
    case 'Temple':
      return new TempleSpec();
    case 'BuildersGuild':
      return new BuildersGuildSpec();
    default:
      return new (class extends BaseBuildingSpec {
        getBuildCost(): Map<any, any> { return new Map(); }
        getUpgradeCost(_: number): Map<any, any> { return new Map(); }
      })();
  }
}
