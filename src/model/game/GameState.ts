import { GameMap } from '../map/GameMap';
import { CivilizationId } from '../map/CivilizationId';
import { PlayerResources } from './PlayerResources';
import { GameClock } from './GameClock';

/**
 * État de la partie : ressources, civilisations, carte, horloge et seed.
 * Couche modèle regroupant les données de jeu.
 * La sérialisation est déléguée à chaque sous-objet (PlayerResources, GameClock, GameMap, etc.).
 */
export class GameState {
  private gameMap: GameMap | null = null;
  private civilizations: CivilizationId[] = [];
  /** Seed utilisé pour la génération de la carte (null si non initialisée). */
  private seed: number | null = null;

  constructor(
    private readonly playerResources: PlayerResources,
    private readonly playerCivilizationId: CivilizationId,
    private readonly gameClock: GameClock
  ) {}

  /** Ressources du joueur. */
  getPlayerResources(): PlayerResources {
    return this.playerResources;
  }

  /** Identifiant de la civilisation du joueur. */
  getPlayerCivilizationId(): CivilizationId {
    return this.playerCivilizationId;
  }

  /** Liste des civilisations de la partie. */
  getCivilizations(): readonly CivilizationId[] {
    return this.civilizations;
  }

  /** Carte de jeu, ou null si non initialisée. */
  getGameMap(): GameMap | null {
    return this.gameMap;
  }

  /** Horloge de jeu. */
  getGameClock(): GameClock {
    return this.gameClock;
  }

  /** Seed de génération de la carte, ou null si non initialisée. */
  getSeed(): number | null {
    return this.seed;
  }

  /** Définit la carte de jeu (lors d'une nouvelle partie ou régénération). */
  setGameMap(map: GameMap | null): void {
    this.gameMap = map;
  }

  /** Définit la liste des civilisations de la partie. */
  setCivilizations(civs: CivilizationId[]): void {
    this.civilizations = [...civs];
  }

  /** Définit le seed de génération (lors d'une nouvelle partie ou régénération). */
  setSeed(seed: number | null): void {
    this.seed = seed;
  }

  /**
   * Sérialise l'état en une chaîne JSON.
   * Chaque sous-objet (PlayerResources, GameClock, GameMap) se sérialise lui-même.
   */
  serialize(): string {
    const obj = {
      playerResources: this.playerResources.serialize(),
      playerCivilizationId: this.playerCivilizationId.serialize(),
      gameClock: this.gameClock.serialize(),
      gameMap: this.gameMap?.serialize() ?? null,
      civilizations: this.civilizations.map((c) => c.serialize()),
      seed: this.seed,
    };
    return JSON.stringify(obj);
  }

  /**
   * Désérialise un GameState depuis une chaîne JSON.
   * Chaque sous-objet est reconstruit via sa méthode deserialize.
   */
  static deserialize(json: string): GameState {
    const obj = JSON.parse(json);
    const pr = PlayerResources.deserialize(obj.playerResources);
    const civId = CivilizationId.deserialize(obj.playerCivilizationId);
    const gc = GameClock.deserialize(obj.gameClock);
    const gs = new GameState(pr, civId, gc);
    gs.setCivilizations((obj.civilizations as string[]).map((s: string) => CivilizationId.deserialize(s)));
    gs.setSeed(obj.seed);
    if (obj.gameMap != null) {
      gs.setGameMap(GameMap.deserialize(obj.gameMap));
    }
    return gs;
  }
}
