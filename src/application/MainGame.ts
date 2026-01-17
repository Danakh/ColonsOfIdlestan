import { MapGenerator, MapGeneratorConfig } from '../controller/MapGenerator';
import { GameMap } from '../model/map/GameMap';
import { HexType } from '../model/map/HexType';
import { CivilizationId } from '../model/map/CivilizationId';

/**
 * Classe principale de l'application de jeu.
 * 
 * Orchestre la génération de la carte et la gestion du jeu.
 * Cette classe se situe au-dessus de la couche MVC.
 */
export class MainGame {
  private gameMap: GameMap | null = null;
  private readonly mapGenerator: MapGenerator;

  constructor() {
    this.mapGenerator = new MapGenerator();
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

    // Créer une civilisation par défaut
    const civilizations = [CivilizationId.create('player1')];

    const config: MapGeneratorConfig = {
      resourceDistribution,
      civilizations,
      seed: actualSeed,
    };

    this.gameMap = this.mapGenerator.generate(config);
  }

  /**
   * Retourne la carte de jeu actuelle.
   * @returns La GameMap, ou null si non initialisée
   */
  getGameMap(): GameMap | null {
    return this.gameMap;
  }

  /**
   * Génère une nouvelle carte avec un nouveau seed.
   */
  regenerate(): void {
    this.initialize();
  }
}
