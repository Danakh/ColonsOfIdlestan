import { IslandMap } from '../map/IslandMap';
import { CivilizationId } from '../map/CivilizationId';
import { Civilization, CivilizationSerialized } from '../map/Civilization';
import { PlayerResources } from './PlayerResources';
import { GameClock } from './GameClock';

/**
 * État de la partie : ressources, civilisations, carte et horloge de jeu.
 * Couche modèle regroupant les données de jeu.
 * La sérialisation est déléguée à chaque sous-objet (PlayerResources, GameClock, IslandMap, etc.).
 */
export class GameState {
  private islandMap: IslandMap | null = null;
  private civilizations: CivilizationId[] = [];
  private civilizationData: Map<string, Civilization> = new Map();
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
  getIslandMap(): IslandMap | null {
    return this.islandMap;
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
  setIslandMap(map: IslandMap | null): void {
    this.islandMap = map;
  }

  /** Définit la liste des civilisations de la partie. */
  setCivilizations(civs: CivilizationId[]): void {
    this.civilizations = [...civs];
    // Initialiser les données de civilisation si elles n'existent pas
    for (const civId of civs) {
      const key = civId.hashCode();
      if (!this.civilizationData.has(key)) {
        this.civilizationData.set(key, new Civilization(civId));
      }
    }
  }

  /**
   * Retourne l'objet Civilization pour un CivilizationId donné.
   * Crée une nouvelle civilisation si elle n'existe pas encore.
   */
  getCivilization(civId: CivilizationId): Civilization {
    const key = civId.hashCode();
    if (!this.civilizationData.has(key)) {
      this.civilizationData.set(key, new Civilization(civId));
    }
    return this.civilizationData.get(key)!;
  }

  /** Définit le seed de génération (lors d'une nouvelle partie ou régénération). */
  setSeed(seed: number | null): void {
    this.seed = seed;
  }

  /**
   * Sérialise l'état en un objet (pas en JSON).
   * Utilisé par CivilizationState pour la sérialisation complète.
   */
  serializeToObject(): {
    playerResources: any;
    playerCivilizationId: string;
    islandMap: any | null;
    civilizations: string[];
    civilizationsData: CivilizationSerialized[];
    seed: number | null;
  } {
    const civilizationsData: CivilizationSerialized[] = [];
    for (const civId of this.civilizations) {
      const civ = this.civilizationData.get(civId.hashCode());
      if (civ) {
        civilizationsData.push(civ.serialize());
      } else {
        // Créer une civilisation par défaut si elle n'existe pas
        civilizationsData.push(new Civilization(civId).serialize());
      }
    }
    return {
      playerResources: this.playerResources.serialize(),
      playerCivilizationId: this.playerCivilizationId.serialize(),
      islandMap: this.islandMap?.serialize() ?? null,
      civilizations: this.civilizations.map((c) => c.serialize()),
      civilizationsData: civilizationsData,
      seed: this.seed,
    };
  }

  /**
   * Désérialise un GameState depuis un objet.
   * Utilisé par CivilizationState pour la désérialisation complète.
   */
  static deserializeFromObject(obj: {
    playerResources: any;
    playerCivilizationId: string;
    islandMap: any | null;
    civilizations: string[];
    civilizationsData: CivilizationSerialized[];
    seed: number | null;
  }): GameState {
    const pr = PlayerResources.deserialize(obj.playerResources);
    const civId = CivilizationId.deserialize(obj.playerCivilizationId);
    const gc = new GameClock();
    const gs = new GameState(pr, civId, gc);
    gs.setCivilizations((obj.civilizations as string[]).map((s: string) => CivilizationId.deserialize(s)));
    
    // Désérialiser les données de civilisation si disponibles
    if (obj.civilizationsData) {
      for (const civData of obj.civilizationsData as CivilizationSerialized[]) {
        const civ = Civilization.deserialize(civData);
        const key = civ.id.hashCode();
        gs.civilizationData.set(key, civ);
      }
    }
    
    gs.setSeed(obj.seed);
    if (obj.islandMap != null) {
      gs.setIslandMap(IslandMap.deserialize(obj.islandMap));
    }
    return gs;
  }

  /**
   * Sérialise l'état en une chaîne JSON.
   * Chaque sous-objet (PlayerResources, GameClock, IslandMap) se sérialise lui-même.
   */
  serialize(): string {
    const civilizationsData: CivilizationSerialized[] = [];
    for (const civId of this.civilizations) {
      const civ = this.civilizationData.get(civId.hashCode());
      if (civ) {
        civilizationsData.push(civ.serialize());
      } else {
        // Créer une civilisation par défaut si elle n'existe pas
        civilizationsData.push(new Civilization(civId).serialize());
      }
    }
    const obj = {
      playerResources: this.playerResources.serialize(),
      playerCivilizationId: this.playerCivilizationId.serialize(),
      gameClock: this.gameClock.serialize(),
      islandMap: this.islandMap?.serialize() ?? null,
      civilizations: this.civilizations.map((c) => c.serialize()),
      civilizationsData: civilizationsData,
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
    
    // Désérialiser les données de civilisation si disponibles
    if (obj.civilizationsData) {
      for (const civData of obj.civilizationsData as CivilizationSerialized[]) {
        const civ = Civilization.deserialize(civData);
        const key = civ.id.hashCode();
        gs.civilizationData.set(key, civ);
      }
    }
    
    gs.setSeed(obj.seed);
    if (obj.islandMap != null) {
      gs.setIslandMap(IslandMap.deserialize(obj.islandMap));
    }
    return gs;
  }
}
