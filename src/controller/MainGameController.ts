import { IslandState } from '../model/game/IslandState';
import { IslandMap } from '../model/map/IslandMap';
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

  getIslandState(): IslandState {
    return this.godState.getCivilizationState().getIslandState();
  }

  getGodPoints(): number {
    return this.godState.getGodPoints();
  }

  getIslandMap(): IslandMap | null {
    return this.getIslandState().getIslandMap();
  }

  getPlayerResources(): PlayerResources {
    return this.getIslandState().getPlayerResources();
  }

  getPlayerCivilizationId(): CivilizationId {
    return this.getIslandState().getPlayerCivilizationId();
  }

  getGameClock(): GameClock {
    return this.getIslandState().getGameClock();
  }

  getSeed(): number | null {
    return this.getIslandState().getSeed();
  }

  updateGameTime(timeSeconds: number): void {
    this.getIslandState().getGameClock().updateTime(timeSeconds);
  }
}
