import { MainGame } from './MainGame';
import { HexMapRenderer } from '../view/HexMapRenderer';
import { CityPanelView } from '../view/CityPanelView';
import { BuildingProductionController } from '../controller/BuildingProductionController';
import { AutomationController } from '../controller/AutomationController';
import { GameCoordinator } from '../controller/GameCoordinator';

export class GameLoop {
  private lastAnimationFrame: number | null = null;
  private gameStartTime: number | null = null;

  constructor(
    private game: MainGame,
    private renderer: HexMapRenderer,
    private cityPanelView: CityPanelView,
    private coordinator: GameCoordinator,
    private updateResourcesDisplay: () => void,
  ) {}

  private processAutomaticBuildingProduction(): void {
    const currentIslandMap = this.game.getIslandMap();
    if (!currentIslandMap) {
      return;
    }

    const civId = this.game.getPlayerCivilizationId();
    const playerResources = this.game.getPlayerResources();
    const gameClock = this.game.getGameClock();

    const productionResults = BuildingProductionController.processAutomaticProduction(
      civId,
      currentIslandMap,
      playerResources,
      gameClock
    );

    if (productionResults.length > 0) {
      for (const result of productionResults) {
        if (result.buildingType === result.buildingType) {
          // reuse existing renderer triggers from main; Market handled via renderer in main previously
          this.renderer.triggerHarvestEffect(result.hexCoord, true);
          this.renderer.triggerResourceHarvestAnimation(result.hexCoord, result.resourceType, result.cityVertex);
        }
      }
      this.cityPanelView.scheduleRefresh();
      // Mettre à jour l'affichage des ressources (inventaire)
      try {
        this.updateResourcesDisplay();
      } catch (e) {
        // silent
      }
    }
  }

  private loop = (timestamp: number): void => {
    if (this.gameStartTime === null) {
      this.gameStartTime = timestamp;
      const savedTime = this.game.getGameClock().getCurrentTime();
      if (savedTime > 0) {
        this.gameStartTime = timestamp - savedTime * 1000;
      }
    }

    const timeSeconds = (timestamp - (this.gameStartTime as number)) / 1000;

    this.game.updateGameTime(timeSeconds);

    this.processAutomaticBuildingProduction();

      const currentIslandMap = this.game.getIslandMap();
    if (currentIslandMap) {
      const civId = this.game.getPlayerCivilizationId();
      const playerResources = this.game.getPlayerResources();
      const civilization = this.game.getIslandState().getCivilization(civId);
      AutomationController.processAllAutomations(civId, civilization, currentIslandMap, playerResources, this.coordinator);

      // Mettre à jour l'UI dépendante des ressources
      try {
        this.updateResourcesDisplay();
      } catch (e) {
        // silent
      }

      this.cityPanelView.scheduleRefresh();
      this.renderer.render(currentIslandMap, civId);
    }

    this.lastAnimationFrame = requestAnimationFrame(this.loop);
  };

  start(): void {
    if (this.lastAnimationFrame !== null) {
      return; // already running
    }
    this.lastAnimationFrame = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.lastAnimationFrame !== null) {
      cancelAnimationFrame(this.lastAnimationFrame);
      this.lastAnimationFrame = null;
    }
    this.gameStartTime = null;
  }

  /**
   * Reset the internal reference time so the next frame recalculates it.
   */
  resetStartTime(): void {
    this.gameStartTime = null;
  }
}

export default GameLoop;
