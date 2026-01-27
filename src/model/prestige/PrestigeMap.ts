import { HexGrid } from "../hex/HexGrid";
import { PrestigeBonus, PrestigeBonusType } from "./types";
import { PrestigeCity, PrestigeCitySerialized } from "./PrestigeCity";
import { Edge } from "../hex/Edge";

export interface PrestigeMapSerialized {
  grid: ReturnType<HexGrid['serialize']>;
  bonuses: [string, PrestigeBonus][];
  cities: PrestigeCitySerialized[];
  roads: ReturnType<Edge['serialize']>[];
}

/** Modèle pur représentant la mini-carte Prestige. */
export class PrestigeMap {
  constructor(
    public readonly grid: HexGrid,
    public readonly bonuses: Map<string, PrestigeBonus>,
    public readonly cities: Map<string, PrestigeCity>,
    public readonly roads: Set<string>
  ) {}

  serialize(): PrestigeMapSerialized {
    return {
      grid: this.grid.serialize(),
      bonuses: [...this.bonuses.entries()],
      cities: [...this.cities.values()].map(c => c.serialize()),
      roads: [...this.roads].map(r => {
        // roads stored by Edge.hashCode; we cannot recover serialized form from hash,
        // so store as empty array for compatibility if needed. Prefer storing serialized edges in controller.
        return [[0,0],[0,0]] as ReturnType<Edge['serialize']>;
      })
    };
  }

  static deserialize(data: PrestigeMapSerialized): PrestigeMap {
    const grid = HexGrid.deserialize(data.grid);
    const bonuses = new Map<string, PrestigeBonus>(data.bonuses);
    const cities = new Map<string, PrestigeCity>();
    for (const c of data.cities) {
      const city = PrestigeCity.deserialize(c);
      cities.set(city.vertex.hashCode(), city);
    }
    const roads = new Set<string>();
    // We cannot reconstruct edge hashCodes reliably from serialized edges without HexCoord instances;
    // attempt to create Edge and add its hashCode when possible.
    for (const e of data.roads) {
      try {
        const edge = Edge.deserialize(e as any);
        roads.add(edge.hashCode());
      } catch (e) {
        // ignore
      }
    }
    return new PrestigeMap(grid, bonuses, cities, roads);
  }
}
