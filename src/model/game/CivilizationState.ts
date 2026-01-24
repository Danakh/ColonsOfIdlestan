import { GameState } from './GameState';
import { GameClock } from './GameClock';
import { PlayerResources } from './PlayerResources';
import { CivilizationId } from '../map/CivilizationId';
import { calculateCivilizationPoints } from './CivilizationPoints';
import { GameMap } from '../map/GameMap';

/**
 * État d'une civilisation : contient GameState, horloge de jeu et points de civilisation.
 * C'est le conteneur principal pour l'état d'une partie.
 * 
 * Structure:
 * - gameState: contient les ressources du joueur, la civilisation, la carte et les données civiles
 * - gameClock: l'horloge de jeu (temps écoulé) - aussi accessible via gameState
 * - civilizationPoints: points de civilisation basés sur les villes et les bâtiments
 * 
 * Responsabilités:
 * - Créer une nouvelle partie
 * - Gérer la sérialisation/désérialisation
 * - Encapsuler l'accès à GameState, GameClock et points de civilisation
 * - Calculer et mettre à jour les points de civilisation
 */
export class CivilizationState {
  private civilizationPoints: number = 0;

  constructor(
    private readonly gameState: GameState,
    private readonly gameClock: GameClock
  ) {}

  /**
   * Crée une nouvelle CivilizationState pour une nouvelle partie.
   */
  static createNew(playerCivilizationId: CivilizationId): CivilizationState {
    const playerResources = new PlayerResources();
    const gameClock = new GameClock();
    const gameState = new GameState(playerResources, playerCivilizationId, gameClock);
    return new CivilizationState(gameState, gameClock);
  }

  /** Accès à l'état du jeu. */
  getGameState(): GameState {
    return this.gameState;
  }

  /** Accès à l'horloge de jeu. */
  getGameClock(): GameClock {
    return this.gameClock;
  }

  /** Accès aux ressources du joueur. */
  getPlayerResources(): PlayerResources {
    return this.gameState.getPlayerResources();
  }

  /** Accès à l'identifiant de civilisation du joueur. */
  getPlayerCivilizationId(): CivilizationId {
    return this.gameState.getPlayerCivilizationId();
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
    const gameMap = this.gameState.getGameMap();
    const civId = this.gameState.getPlayerCivilizationId();
    
    if (gameMap && civId) {
      this.civilizationPoints = calculateCivilizationPoints(gameMap, civId);
    }
  }

  /**
   * Sérialise l'état en une chaîne JSON.
   * Sérialise GameState et les points de civilisation.
   */
  serialize(): string {
    const obj = {
      gameState: this.gameState.serialize(),
      civilizationPoints: this.civilizationPoints,
    };
    return JSON.stringify(obj);
  }

  /**
   * Désérialise un CivilizationState depuis une chaîne JSON.
   */
  static deserialize(json: string): CivilizationState {
    const obj = JSON.parse(json);
    const gameState = GameState.deserialize(obj.gameState);
    const gameClock = gameState.getGameClock();
    const civState = new CivilizationState(gameState, gameClock);
    
    // Restaurer les points de civilisation s'ils existent
    if (obj.civilizationPoints !== undefined) {
      civState.setCivilizationPoints(obj.civilizationPoints);
    }
    
    return civState;
  }
}

