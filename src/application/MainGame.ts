import { MapGenerator, MapGeneratorConfig } from '../controller/MapGenerator';
import { MainGameController } from '../controller/MainGameController';
import { GameMap } from '../model/map/GameMap';
import { HexType } from '../model/map/HexType';
import { GameState } from '../model/game/GameState';
import { PlayerResources } from '../model/game/PlayerResources';
import { GameClock } from '../model/game/GameClock';
import { CivilizationId } from '../model/map/CivilizationId';

/**
 * Point d'entrée applicatif : NewGame (génération de carte), SaveGame et LoadGame.
 * La gestion du jeu (état, temps, etc.) est déléguée à MainGameController.
 */
export class MainGame {
  private readonly mapGenerator: MapGenerator;
  private readonly controller: MainGameController;

  constructor() {
    this.mapGenerator = new MapGenerator();
    const gameState = new GameState(
      new PlayerResources(),
      CivilizationId.create('player1'),
      new GameClock()
    );
    this.controller = new MainGameController(gameState);
  }

  /**
   * Retourne le contrôleur de partie (accès à la carte, ressources, horloge, etc.).
   */
  getController(): MainGameController {
    return this.controller;
  }

  /**
   * Démarre une nouvelle partie : génère une carte et réinitialise l'état.
   * @param seed - Seed optionnel pour la génération (par défaut: timestamp)
   */
  newGame(seed?: number): void {
    const actualSeed = seed ?? Date.now();
    const state = this.controller.getGameState();

    const resourceDistribution = new Map<HexType, number>([
      [HexType.Wood, 5],
      [HexType.Brick, 5],
      [HexType.Wheat, 5],
      [HexType.Sheep, 5],
      [HexType.Ore, 5],
      [HexType.Desert, 1],
    ]);

    const civilizations = [state.getPlayerCivilizationId()];
    const config: MapGeneratorConfig = {
      resourceDistribution,
      civilizations,
      seed: actualSeed,
    };

    const gameMap = this.mapGenerator.generate(config);
    state.setGameMap(gameMap);
    state.setCivilizations(civilizations);
    state.setSeed(actualSeed);
    state.getPlayerResources().clear();
    state.getGameClock().reset();
  }

  /**
   * Sauvegarde la partie en une chaîne (sérialisation de GameState).
   */
  saveGame(): string {
    return this.controller.getGameState().serialize();
  }

  /**
   * Charge une partie depuis une chaîne et remplace l'état du contrôleur.
   */
  loadGame(serialized: string): void {
    const state = GameState.deserialize(serialized);
    this.controller.setGameState(state);
  }

  // ——— Délégations vers le contrôleur (compatibilité / raccourcis) ———

  getGameState(): GameState {
    return this.controller.getGameState();
  }

  getGameMap(): GameMap | null {
    return this.controller.getGameMap();
  }

  getPlayerResources(): PlayerResources {
    return this.controller.getPlayerResources();
  }

  getPlayerCivilizationId(): CivilizationId {
    return this.controller.getPlayerCivilizationId();
  }

  getGameClock(): GameClock {
    return this.controller.getGameClock();
  }

  getSeed(): number | null {
    return this.controller.getSeed();
  }

  updateGameTime(timeSeconds: number): void {
    this.controller.updateGameTime(timeSeconds);
  }
}
