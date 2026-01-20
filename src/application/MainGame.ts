import { MapGenerator, MapGeneratorConfig } from '../controller/MapGenerator';
import { GameMap } from '../model/map/GameMap';
import { HexType } from '../model/map/HexType';
import { CivilizationId } from '../model/map/CivilizationId';
import { GameState } from '../model/game/GameState';
import { PlayerResources } from '../model/game/PlayerResources';
import { GameClock } from '../model/game/GameClock';

/**
 * Classe principale de l'application de jeu.
 *
 * Orchestre la génération de la carte et la gestion du jeu.
 * Possède un GameState (couche modèle) regroupant ressources, civilisations, carte et horloge.
 */
export class MainGame {
  private readonly mapGenerator: MapGenerator;
  private readonly gameState: GameState;

  constructor() {
    this.mapGenerator = new MapGenerator();
    this.gameState = new GameState(
      new PlayerResources(),
      CivilizationId.create('player1'),
      new GameClock()
    );
  }

  /**
   * Retourne l'état de la partie (ressources, civilisations, carte, horloge).
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Initialise une nouvelle partie en générant une carte.
   * @param seed - Seed optionnel pour la génération (par défaut: timestamp)
   */
  initialize(seed?: number): void {
    const actualSeed = seed ?? Date.now();

    // Configuration : 5 hexagones de chaque type (sauf Water qui est généré automatiquement)
    const resourceDistribution = new Map<HexType, number>([
      [HexType.Wood, 5],
      [HexType.Brick, 5],
      [HexType.Wheat, 5],
      [HexType.Sheep, 5],
      [HexType.Ore, 5],
      [HexType.Desert, 1],
    ]);

    const civilizations = [this.gameState.getPlayerCivilizationId()];

    const config: MapGeneratorConfig = {
      resourceDistribution,
      civilizations,
      seed: actualSeed,
    };

    const gameMap = this.mapGenerator.generate(config);
    this.gameState.setGameMap(gameMap);
    this.gameState.setCivilizations(civilizations);
    this.gameState.setSeed(actualSeed);

    this.gameState.getPlayerResources().clear();
    this.gameState.getGameClock().reset();
  }

  /**
   * Retourne la carte de jeu actuelle.
   * @returns La GameMap, ou null si non initialisée
   */
  getGameMap(): GameMap | null {
    return this.gameState.getGameMap();
  }

  /**
   * Retourne l'inventaire du joueur.
   * @returns L'inventaire du joueur
   */
  getPlayerResources(): PlayerResources {
    return this.gameState.getPlayerResources();
  }

  /**
   * Retourne l'identifiant de la civilisation du joueur.
   * @returns L'identifiant de la civilisation
   */
  getPlayerCivilizationId(): CivilizationId {
    return this.gameState.getPlayerCivilizationId();
  }

  /**
   * Génère une nouvelle carte avec un nouveau seed.
   */
  regenerate(): void {
    this.initialize();
  }

  /**
   * Retourne l'horloge de jeu.
   * @returns L'horloge de jeu
   */
  getGameClock(): GameClock {
    return this.gameState.getGameClock();
  }

  /**
   * Retourne le seed de génération de la carte, ou null si non initialisée.
   */
  getSeed(): number | null {
    return this.gameState.getSeed();
  }

  /**
   * Met à jour le temps de l'horloge de jeu.
   * Doit être appelée par la couche applicative à chaque frame.
   * @param timeSeconds - Le temps actuel en secondes
   */
  updateGameTime(timeSeconds: number): void {
    this.gameState.getGameClock().updateTime(timeSeconds);
  }
}
