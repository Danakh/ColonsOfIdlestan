import { GameState } from '../model/game/GameState';
import { GameMap } from '../model/map/GameMap';
import { PlayerResources } from '../model/game/PlayerResources';
import { CivilizationId } from '../model/map/CivilizationId';
import { GameClock } from '../model/game/GameClock';
import { GodState } from '../model/game/GodState';

/**
 * Contrôleur de la partie : expose l'état du jeu et les mises à jour (temps).
 * Toute la gestion du jeu est déléguée ici ; MainGame assure NewGame, SaveGame, LoadGame.
 */
export class MainGameController {
  private godState: GodState;
  constructor(godState: GodState) {
    this.godState = godState;
  }

  getGodState(): GodState {
    return this.godState;
  }

  setGodState(godState: GodState): void {
    this.godState = godState;
  }

  getCivilizationState() {
    return this.godState.getCivilizationState();
  }

  getGameState(): GameState {
    return this.godState.getCivilizationState().getGameState();
  }

  getGodPoints(): number {
    return this.godState.getGodPoints();
  }

  getGameMap(): GameMap | null {
    return this.getGameState().getGameMap();
  }

  getPlayerResources(): PlayerResources {
    return this.getGameState().getPlayerResources();
  }

  getPlayerCivilizationId(): CivilizationId {
    return this.getGameState().getPlayerCivilizationId();
  }

  getGameClock(): GameClock {
    return this.getGameState().getGameClock();
  }

  getSeed(): number | null {
    return this.getGameState().getSeed();
  }

  updateGameTime(timeSeconds: number): void {
    this.getGameState().getGameClock().updateTime(timeSeconds);
  }
}
