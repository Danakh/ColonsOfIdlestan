import { GameState } from '../model/game/GameState';
import { GameMap } from '../model/map/GameMap';
import { PlayerResources } from '../model/game/PlayerResources';
import { CivilizationId } from '../model/map/CivilizationId';
import { GameClock } from '../model/game/GameClock';

/**
 * Contrôleur de la partie : expose l'état du jeu et les mises à jour (temps).
 * Toute la gestion du jeu est déléguée ici ; MainGame assure NewGame, SaveGame, LoadGame.
 */
export class MainGameController {
  constructor(private gameState: GameState) {}

  getGameState(): GameState {
    return this.gameState;
  }

  setGameState(state: GameState): void {
    this.gameState = state;
  }

  getGameMap(): GameMap | null {
    return this.gameState.getGameMap();
  }

  getPlayerResources(): PlayerResources {
    return this.gameState.getPlayerResources();
  }

  getPlayerCivilizationId(): CivilizationId {
    return this.gameState.getPlayerCivilizationId();
  }

  getGameClock(): GameClock {
    return this.gameState.getGameClock();
  }

  getSeed(): number | null {
    return this.gameState.getSeed();
  }

  updateGameTime(timeSeconds: number): void {
    this.gameState.getGameClock().updateTime(timeSeconds);
  }
}
