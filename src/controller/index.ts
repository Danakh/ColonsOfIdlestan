/**
 * Module Controller pour la génération de cartes et la gestion des actions de jeu.
 * Fournit les composants responsables de la logique de contrôle,
 * de génération de GameMap et de construction de routes.
 */

export { MainGameController } from './MainGameController';
export { MapGenerator, type MapGeneratorConfig } from './MapGenerator';
export { RoadController } from './RoadController';
export { ResourceHarvestController } from './ResourceHarvestController';
export { BuildingController, type BuildableBuildingStatus } from './BuildingController';
export { TradeController } from './TradeController';
export { BuildingProductionController, type BuildingProductionResult } from './BuildingProductionController';
export { OutpostController } from './OutpostController';
