import { MapGenerator, MapGeneratorConfig } from '../controller/MapGenerator';
import { MainGameController } from '../controller/MainGameController';
import { IslandMap } from '../model/map/IslandMap';
import { HexType } from '../model/map/HexType';
import { GameState } from '../model/game/GameState';
import { PlayerResources } from '../model/game/PlayerResources';
import { GameClock } from '../model/game/GameClock';
import { CivilizationId } from '../model/map/CivilizationId';
import { CivilizationState } from '../model/game/CivilizationState';
import { GodState } from '../model/game/GodState';
import { PlayerSave } from '../model/game/PlayerSave';

/**
 * Point d'entrée applicatif : NewGame (génération de carte), SaveGame et LoadGame.
 * La gestion du jeu (état, temps, etc.) est déléguée à MainGameController.
 */
export class MainGame {
  private readonly mapGenerator: MapGenerator;
  private controller: MainGameController;
  private playerSave: PlayerSave;

  constructor() {
    this.mapGenerator = new MapGenerator();
    // Initialisation du PlayerSave (création si absent)
    const civId = CivilizationId.create('player1');
    const civilizationState = CivilizationState.createNew(civId);
    const godState = new GodState(0, civilizationState);
    this.playerSave = new PlayerSave(godState);
    this.controller = new MainGameController(godState);
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
  /**
   * Démarre une nouvelle partie : détruit le GameState et en crée un nouveau dans le PlayerSave.
   * Ne touche pas aux GodPoints.
   */
  newGame(seed?: number): void {
    const actualSeed = seed ?? Date.now();
    // On recrée le CivilizationState et GameState
    const civId = CivilizationId.create('player1');
    const civilizationState = CivilizationState.createNew(civId);
    const state = civilizationState.getGameState();

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

    const islandMap = this.mapGenerator.generate(config);
    state.setIslandMap(islandMap);
    state.setCivilizations(civilizations);
    state.setSeed(actualSeed);
    state.getPlayerResources().clear();
    state.getGameClock().reset();

    // On conserve les GodPoints existants
    const godPoints = this.playerSave.getGodState().getGodPoints();
    const godState = new GodState(godPoints, civilizationState);
    this.playerSave = new PlayerSave(godState);
    this.controller = new MainGameController(godState);
  }

  /**
   * Sauvegarde la partie en une chaîne (sérialisation de PlayerSave).
   */
  saveGame(): string {
    return JSON.stringify(this.playerSave.serialize());
  }

  /**
   * Charge une partie depuis une chaîne et remplace l'état du contrôleur.
   */
  loadGame(serialized: string): void {
    const data = JSON.parse(serialized);
    this.playerSave = PlayerSave.deserialize(data);
    const godState = this.playerSave.getGodState();
    const civilizationState = godState.getCivilizationState();
    this.controller = new MainGameController(godState);
  }

  /**
   * Efface la sauvegarde (détruit le PlayerSave et recrée tout).
   */
  clearSave(): void {
    const civId = CivilizationId.create('player1');
    const civilizationState = CivilizationState.createNew(civId);
    const godState = new GodState(0, civilizationState);
    this.playerSave = new PlayerSave(godState);
    this.controller = new MainGameController(godState);
  }

  // ——— Délégations vers le contrôleur (compatibilité / raccourcis) ———

  getGameState(): GameState {
    return this.controller.getGameState();
  }

  getIslandMap(): IslandMap | null {
    return this.controller.getIslandMap();
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
