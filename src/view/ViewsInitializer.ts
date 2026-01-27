import { MainGame } from '../application/MainGame';
import { HexMapRenderer } from './HexMapRenderer';
import { CityPanelView } from './CityPanelView';
import { TradePanelView } from './TradePanelView';
import { PortSpecializationPanelView } from './PortSpecializationPanelView';
import { AutomationPanelView } from './AutomationPanelView';
import { PrestigeConfirmationPanel } from './PrestigePanelView';
import { ResourceLoader } from './ResourceLoader';

export interface ViewsCollection {
  cityPanelView: CityPanelView;
  tradePanelView: TradePanelView;
  portSpecializationPanelView: PortSpecializationPanelView;
  automationPanelView: AutomationPanelView;
  prestigeConfirmationPanel: PrestigeConfirmationPanel;
  inventoryView: import('./InventoryView').InventoryView;
}

/**
 * Helper to create and wire base views (renderer binding, resource sprites).
 * Keeps `main.ts` focused on orchestration.
 */
export function initializeViews(
  game: MainGame,
  renderer: HexMapRenderer,
  resourceLoader: ResourceLoader,
): ViewsCollection {
  const cityPanelView = new CityPanelView('city-panel');
  const tradePanelView = new TradePanelView('trade-panel');
  const portSpecializationPanelView = new PortSpecializationPanelView('port-specialization-panel');
  const automationPanelView = new AutomationPanelView('automation-panel');
  const prestigeConfirmationPanel = new PrestigeConfirmationPanel('prestige-panel');

  // Bind renderer and game context where appropriate
  cityPanelView.setRenderer(renderer);
  cityPanelView.bind(renderer, {
    getIslandMap: () => game.getIslandMap(),
    getPlayerResources: () => game.getPlayerResources(),
  });

  // Wire resource sprites to trade/port panels and return inventory view from loader
  const resourceSprites = resourceLoader.getResourceSprites();
  tradePanelView.setResourceSprites(resourceSprites);
  portSpecializationPanelView.setResourceSprites(resourceSprites);

  return {
    cityPanelView,
    tradePanelView,
    portSpecializationPanelView,
    automationPanelView,
    prestigeConfirmationPanel,
    inventoryView: resourceLoader.getInventoryView(),
  };
}

export default initializeViews;
