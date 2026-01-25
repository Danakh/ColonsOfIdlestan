import { IslandState } from './IslandState';
import { GameClock } from './GameClock';
import { PlayerResources } from './PlayerResources';
import { CivilizationId } from '../map/CivilizationId';
import { calculateCivilizationPoints } from './CivilizationPoints';
import { IslandMap } from '../map/IslandMap';

/**
 * État d'une civilisation : contient IslandState, horloge de jeu et points de civilisation.
 * C'est le conteneur principal pour l'état d'une partie.
 * 
 * Structure:
 * - islandState: contient les ressources du joueur, la civilisation, la carte et les données civiles
 * - gameClock: l'horloge de jeu (temps écoulé) - aussi accessible via islandState
 * - civilizationPoints: points de civilisation basés sur les villes et les bâtiments
 * 
 * Responsabilités:
 * - Créer une nouvelle partie
 * - Gérer la sérialisation/désérialisation
 * - Encapsuler l'accès à IslandState, GameClock et points de civilisation
 * - Calculer et mettre à jour les points de civilisation
 */
export class CivilizationState {
  private civilizationPoints: number = 0;

  constructor(
    private readonly islandState: IslandState,
    private readonly gameClock: GameClock
  ) {}

  /**
   * Crée une nouvelle CivilizationState pour une nouvelle partie.
   */
  static createNew(playerCivilizationId: CivilizationId): CivilizationState {
    const playerResources = new PlayerResources();
    const gameClock = new GameClock();
    const islandState = new IslandState(playerResources, playerCivilizationId, gameClock);
    return new CivilizationState(islandState, gameClock);
  }

  /** Accès à l'état du jeu. */
  getIslandState(): IslandState {
    return this.islandState;
  }

  /** Accès à l'horloge de jeu. */
  getGameClock(): GameClock {
    return this.gameClock;
  }

  /** Accès aux ressources du joueur. */
  getPlayerResources(): PlayerResources {
    return this.islandState.getPlayerResources();
  }

  /** Accès à l'identifiant de civilisation du joueur. */
  getPlayerCivilizationId(): CivilizationId {
    return this.islandState.getPlayerCivilizationId();
  }

  /** Retourne les points de civilisation actuels. */
  getCivilizationPoints(): number {
    return this.civilizationPoints;
  }

  /** Définit les points de civilisation. */
  setCivilizationPoints(points: number): void {
    this.civilizationPoints = points;
  }

  /**
   * Calcule et met à jour les points de civilisation basés sur l'état actuel de la carte.
   * Doit être appelé chaque fois que la carte change (construction de bâtiments, amélioration de villes, etc.).
   */
  updateCivilizationPoints(): void {
    const islandMap = this.islandState.getIslandMap();
    const civId = this.islandState.getPlayerCivilizationId();
    
    if (islandMap && civId) {
      this.civilizationPoints = calculateCivilizationPoints(islandMap, civId);
    }
  }

  /**
   * Sérialise l'état en une chaîne JSON.
   * Sérialise IslandState et les points de civilisation.
   */
  serialize(): string {
    const obj = {
      islandState: this.islandState.serialize(),
      civilizationPoints: this.civilizationPoints,
    };
    return JSON.stringify(obj);
  }

  /**
   * Désérialise un CivilizationState depuis une chaîne JSON.
   */
  static deserialize(json: string): CivilizationState {
    const obj = JSON.parse(json);
    const islandState = IslandState.deserialize(obj.islandState);
    const gameClock = islandState.getGameClock();
    const civState = new CivilizationState(islandState, gameClock);
    
    // Restaurer les points de civilisation s'ils existent
    if (obj.civilizationPoints !== undefined) {
      civState.setCivilizationPoints(obj.civilizationPoints);
    }
    
    return civState;
  }
}

