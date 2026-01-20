import { GameMap } from '../map/GameMap';
import { CivilizationId } from '../map/CivilizationId';
import { PlayerResources } from './PlayerResources';
import { GameClock } from './GameClock';

/**
 * État de la partie : ressources, civilisations, carte et horloge.
 * Couche modèle regroupant les données de jeu.
 */
export class GameState {
  private gameMap: GameMap | null = null;
  private civilizations: CivilizationId[] = [];

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

  /** Définit la carte de jeu (lors d'une nouvelle partie ou régénération). */
  setGameMap(map: GameMap | null): void {
    this.gameMap = map;
  }

  /** Définit la liste des civilisations de la partie. */
  setCivilizations(civs: CivilizationId[]): void {
    this.civilizations = [...civs];
  }
}
