import { GameMap } from '../map/GameMap';
import { CivilizationId } from '../map/CivilizationId';
import { PlayerResources } from './PlayerResources';
import { GameClock } from './GameClock';
import { ResourceType } from '../map/ResourceType';
import { Hex } from '../hex/Hex';
import { HexCoord } from '../hex/HexCoord';
import { HexGrid } from '../hex/HexGrid';
import { HexType } from '../map/HexType';
import { Edge } from '../hex/Edge';
import { Vertex } from '../hex/Vertex';
import { CityLevel } from '../city/CityLevel';
import { BuildingType, getResourceProductionBuildings } from '../city/BuildingType';

/** Format JSON pour la sérialisation de GameState. */
interface GameStateJson {
  playerResources: Record<string, number>;
  playerCivilizationId: string;
  gameClockTime: number;
  gameMap: GameMapJson | null;
  civilizations: string[];
  seed: number | null;
}

interface GameMapJson {
  hexes: [number, number][];
  hexTypes: Record<string, string>;
  civilizations: string[];
  cities: CityJson[];
  roads: RoadJson[];
}

interface CityJson {
  vertex: [number, number][];
  owner: string;
  level: number;
  buildings: string[];
  buildingProductionTimes: Record<string, number>;
}

interface RoadJson {
  edge: [[number, number], [number, number]];
  owner: string;
}

/**
 * État de la partie : ressources, civilisations, carte, horloge et seed.
 * Couche modèle regroupant les données de jeu.
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
   */
  serialize(): string {
    const resources: Record<string, number> = {};
    for (const [k, v] of this.playerResources.getAllResources().entries()) {
      resources[k] = v;
    }
    const gameMapJson: GameMapJson | null = this.gameMap
      ? this.serializeGameMap(this.gameMap)
      : null;
    const obj: GameStateJson = {
      playerResources: resources,
      playerCivilizationId: this.playerCivilizationId.getValue(),
      gameClockTime: this.gameClock.getCurrentTime(),
      gameMap: gameMapJson,
      civilizations: this.civilizations.map((c) => c.getValue()),
      seed: this.seed,
    };
    return JSON.stringify(obj);
  }

  private serializeGameMap(map: GameMap): GameMapJson {
    const grid = map.getGrid();
    const hexes: [number, number][] = grid.getAllHexes().map((h) => [h.coord.q, h.coord.r]);
    const hexTypes: Record<string, string> = {};
    for (const h of grid.getAllHexes()) {
      const t = map.getHexType(h.coord);
      if (t != null) hexTypes[h.coord.hashCode()] = t;
    }
    const cities: CityJson[] = [];
    const resourceBuildings = getResourceProductionBuildings();
    for (const civId of this.civilizations) {
      for (const city of map.getCitiesByCivilization(civId)) {
        const [h1, h2, h3] = city.vertex.getHexes();
        const bpt: Record<string, number> = {};
        for (const bt of resourceBuildings) {
          if (city.hasBuilding(bt)) {
            const t = city.getBuildingProductionTime(bt);
            if (t !== undefined) bpt[bt] = t;
          }
        }
        cities.push({
          vertex: [
            [h1.q, h1.r],
            [h2.q, h2.r],
            [h3.q, h3.r],
          ],
          owner: city.owner.getValue(),
          level: city.level,
          buildings: [...city.getBuildings()],
          buildingProductionTimes: bpt,
        });
      }
    }
    const roads: RoadJson[] = [];
    for (const civId of this.civilizations) {
      for (const edge of map.getRoadsForCivilization(civId)) {
        const [a, b] = edge.getHexes();
        roads.push({
          edge: [
            [a.q, a.r],
            [b.q, b.r],
          ],
          owner: civId.getValue(),
        });
      }
    }
    return {
      hexes,
      hexTypes,
      civilizations: this.civilizations.map((c) => c.getValue()),
      cities,
      roads,
    };
  }

  /**
   * Désérialise un GameState depuis une chaîne JSON.
   */
  static deserialize(json: string): GameState {
    const obj: GameStateJson = JSON.parse(json);
    const pr = new PlayerResources();
    pr.clear();
    for (const rt of Object.values(ResourceType)) {
      const n = obj.playerResources[rt] ?? 0;
      if (n > 0) pr.addResource(rt, n);
    }
    const civId = CivilizationId.create(obj.playerCivilizationId);
    const gc = new GameClock();
    gc.updateTime(obj.gameClockTime);
    const gs = new GameState(pr, civId, gc);
    gs.setCivilizations(obj.civilizations.map((v) => CivilizationId.create(v)));
    gs.setSeed(obj.seed);
    if (obj.gameMap) {
      gs.setGameMap(GameState.deserializeGameMap(obj.gameMap));
    }
    return gs;
  }

  private static deserializeGameMap(m: GameMapJson): GameMap {
    const hexes = m.hexes.map(([q, r]) => new Hex(new HexCoord(q, r)));
    const grid = new HexGrid(hexes);
    const map = new GameMap(grid);
    for (const [key, type] of Object.entries(m.hexTypes)) {
      const [q, r] = key.split(',').map(Number);
      map.setHexType(new HexCoord(q, r), type as HexType);
    }
    for (const c of m.civilizations) {
      map.registerCivilization(CivilizationId.create(c));
    }
    for (const c of m.cities) {
      const [h1, h2, h3] = c.vertex.map(([q, r]) => new HexCoord(q, r));
      const v = Vertex.create(h1, h2, h3);
      const owner = CivilizationId.create(c.owner);
      map.addCity(v, owner, c.level as CityLevel);
      const city = map.getCity(v)!;
      for (const b of c.buildings) {
        city.addBuilding(b as BuildingType);
      }
      for (const [bt, time] of Object.entries(c.buildingProductionTimes)) {
        city.setBuildingProductionTime(bt as BuildingType, time);
      }
    }
    for (const r of m.roads) {
      const [[q1, r1], [q2, r2]] = r.edge;
      const e = Edge.create(new HexCoord(q1, r1), new HexCoord(q2, r2));
      map.addRoad(e, CivilizationId.create(r.owner));
    }
    return map;
  }
}
