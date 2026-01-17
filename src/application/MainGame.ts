import { MapGenerator, MapGeneratorConfig } from '../controller/MapGenerator';
import { GameMap } from '../model/map/GameMap';
import { ResourceType } from '../model/map/ResourceType';
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

    // Configuration : 5 ressources de chaque type (sauf Water qui est généré automatiquement)
    const resourceDistribution = new Map<ResourceType, number>([
      [ResourceType.Wood, 5],
      [ResourceType.Brick, 5],
      [ResourceType.Wheat, 5],
      [ResourceType.Sheep, 5],
      [ResourceType.Ore, 5],
      [ResourceType.Desert, 5],
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
