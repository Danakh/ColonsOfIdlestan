import { MainGame } from '../application/MainGame';
import { HexMapRenderer } from '../view/HexMapRenderer';
import { Vertex } from '../model/hex/Vertex';
import { Edge } from '../model/hex/Edge';
import { HexCoord } from '../model/hex/HexCoord';
import { ResourceType } from '../model/map/ResourceType';
import { BuildingType, getResourceProductionBuildings } from '../model/city/BuildingType';
import { OutpostController } from './OutpostController';
import { RoadController } from './RoadController';
import { ResourceHarvestController } from './ResourceHarvestController';
import { TradeController } from './TradeController';
import { BuildingController } from './BuildingController';
import { SaveManager } from '../application/SaveManager';
import { t } from '../i18n';

export class GameCoordinator {
  constructor(
    private game: MainGame,
    private renderer: HexMapRenderer,
    private saveManager?: SaveManager,
  ) {}

  private getContext() {
    const islandMap = this.game.getIslandMap();
    const civId = this.game.getPlayerCivilizationId();
    const playerResources = this.game.getPlayerResources();
    return { islandMap, civId, playerResources };
  }

  buildOutpost(vertex: Vertex): { success: boolean } {
    const { islandMap, civId, playerResources } = this.getContext();
    if (!islandMap || civId == null) {
      return { success: false };
    }
    try {
      OutpostController.buildOutpost(vertex, civId, islandMap, playerResources);
      this.saveManager?.saveToLocal();
      return { success: true };
    } catch (error) {
      console.error(t('error.operationFailed', { op: 'buildOutpost' }), error);
      return { success: false };
    }
  }

  buildRoad(edge: Edge): { success: boolean } {
    const { islandMap, civId, playerResources } = this.getContext();
    if (!islandMap || civId == null) {
      return { success: false };
    }
    try {
      RoadController.buildRoad(edge, civId, islandMap, playerResources);
      this.saveManager?.saveToLocal();
      return { success: true };
    } catch (error) {
      console.error(t('error.operationFailed', { op: 'buildRoad' }), error);
      return { success: false };
    }
  }

  harvestHex(hexCoord: HexCoord): { success: boolean; cityVertex?: Vertex } {
    const { islandMap, civId, playerResources } = this.getContext();
    if (!islandMap || civId == null) {
      return { success: false };
    }
    try {
      const civ = this.game.getIslandState().getCivilization(civId);
      const resourceMultiplier = civ.getResourceGainMultiplier();
      const result = ResourceHarvestController.harvest(hexCoord, civId, islandMap, playerResources, { resourceMultiplier });
      if (result.success) {
        this.saveManager?.saveToLocal();
      }
      return { success: result.success, cityVertex: result.cityVertex! };
    } catch (error) {
      console.error(t('error.operationFailed', { op: 'harvestHex' }), error);
      return { success: false };
    }
  }

  performBatchTrade(offered: Map<ResourceType, number>, requested: Map<ResourceType, number>): { success: boolean } {
    const { islandMap, civId, playerResources } = this.getContext();
    if (!islandMap || civId == null) {
      return { success: false };
    }
    try {
      TradeController.performBatchTrade(offered, requested, civId, islandMap, playerResources);
      this.saveManager?.saveToLocal();
      return { success: true };
    } catch (error) {
      console.error(t('error.operationFailed', { op: 'performBatchTrade' }), error);
      return { success: false };
    }
  }

  buildBuilding(buildingType: BuildingType, city: any, vertex: Vertex): { success: boolean } {
    const { islandMap, civId, playerResources } = this.getContext();
    if (!islandMap) {
      return { success: false };
    }
    try {
      BuildingController.buildBuilding(buildingType, city, islandMap, vertex, playerResources);
      // If resource building, initialize production time
      const resourceBuildings = getResourceProductionBuildings();
      if (resourceBuildings.includes(buildingType)) {
        const currentTime = this.game.getGameClock().getCurrentTime();
        city.getBuilding(buildingType)?.setProductionTimeSeconds(currentTime);
      }
      this.saveManager?.saveToLocal();
      return { success: true };
    } catch (error) {
      console.error(t('error.operationFailed', { op: 'buildBuilding' }), error);
      return { success: false };
    }
  }

  upgradeBuilding(buildingType: BuildingType, city: any): { success: boolean } {
    const { islandMap, civId, playerResources } = this.getContext();
    if (!islandMap) {
      return { success: false };
    }
    try {
      BuildingController.upgradeBuilding(buildingType, city, islandMap, playerResources);
      this.saveManager?.saveToLocal();
      return { success: true };
    } catch (error) {
      console.error(t('error.operationFailed', { op: 'upgradeBuilding' }), error);
      return { success: false };
    }
  }
}

export default GameCoordinator;
