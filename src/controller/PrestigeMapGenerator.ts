import { Hex } from "../model/hex/Hex";
import { HexCoord } from "../model/hex/HexCoord";
import { HexGrid } from "../model/hex/HexGrid";
import { HexType } from "../model/map/HexType";
import { SecondaryHexDirection } from "../model/hex/SecondaryHexDirection";
import { Vertex } from "../model/hex/Vertex";
import { Edge } from "../model/hex/Edge";
import { PrestigeMap } from "../model/prestige/PrestigeMap";
import { PrestigeBonusType, PrestigeBonus } from "../model/prestige/types";
import { PrestigeCity } from "../model/prestige/PrestigeCity";
import { CivilizationState } from "../model/game/CivilizationState";
import { CityLevel } from "../model/city/CityLevel";

/** Controller responsable de la génération et des achats sur la mini-carte Prestige. */
export class PrestigeMapGenerator {
  /** Génère et attache un PrestigeMap à la CivilizationState du joueur. */
  static generate(civState: CivilizationState): PrestigeMap {
    const center = new Hex(new HexCoord(0, 0));
    const east = new Hex(new HexCoord(1, 0));
    const west = new Hex(new HexCoord(-1, 0));

    const grid = new HexGrid([center, east, west]);
    // Set visual hex types
    // Note: grid.hexes are Hex objects; HexGrid will manage them
    const bonuses = new Map<string, PrestigeBonus>();
    bonuses.set(center.coord.hashCode(), { type: PrestigeBonusType.Production, value: 2, label: "+2 production" });
    bonuses.set(east.coord.hashCode(), { type: PrestigeBonusType.CivilizationPoint, value: 5, label: "+5 civ points" });
    bonuses.set(west.coord.hashCode(), { type: PrestigeBonusType.CostReduction, value: 0.1, label: "10% cost reduction" });

    // Build cities map and place initial city at north vertex of center
    const cities = new Map<string, PrestigeCity>();
    const northVertex = center.getVertexBySecondaryDirection(SecondaryHexDirection.N);
    if (northVertex) {
      const city = new PrestigeCity(northVertex, CityLevel.Colony);
      cities.set(northVertex.hashCode(), city);
    }

    // Set hex types for visuals (not required by PrestigeMap but useful)
    // Use HexGrid edges to set visual types elsewhere if needed

    const roads = new Set<string>();

    const prestigeMap = new PrestigeMap(grid, bonuses, cities, roads);
    civState.setPrestigeMap(prestigeMap);
    return prestigeMap;
  }

  static roadBuildCost(): number {
    return 2;
  }

  static newCityCost(): number {
    return 10;
  }

  static upgradeCityCost(level: number): number {
    return 10 * Math.pow(level + 1, 2);
  }

  static buyRoad(edge: Edge, civState: CivilizationState): void {
    const cost = this.roadBuildCost();
    if (civState.getCivilizationPoints() < cost) {
      throw new Error('Not enough civilization points');
    }
    const prestigeMap = civState.getPrestigeMap();
    if (!prestigeMap) throw new Error('Prestige map not initialized');

    // Verify both hexes exist in grid
    const [h1, h2] = edge.getHexes();
    if (!prestigeMap.grid.hasHex(h1) || !prestigeMap.grid.hasHex(h2)) {
      throw new Error('Edge hexes do not exist in prestige grid');
    }
    prestigeMap.roads.add(edge.hashCode());
    civState.setCivilizationPoints(civState.getCivilizationPoints() - cost);
  }

  static buildCity(vertex: Vertex, civState: CivilizationState): void {
    const cost = this.newCityCost();
    if (civState.getCivilizationPoints() < cost) {
      throw new Error('Not enough civilization points');
    }
    const prestigeMap = civState.getPrestigeMap();
    if (!prestigeMap) throw new Error('Prestige map not initialized');
    if (prestigeMap.cities.has(vertex.hashCode())) {
      throw new Error('City already exists at this vertex');
    }
    const city = new PrestigeCity(vertex, CityLevel.Outpost);
    prestigeMap.cities.set(vertex.hashCode(), city);
    civState.setCivilizationPoints(civState.getCivilizationPoints() - cost);
  }

  static upgradeCity(vertex: Vertex, civState: CivilizationState): void {
    const prestigeMap = civState.getPrestigeMap();
    if (!prestigeMap) throw new Error('Prestige map not initialized');
    const city = prestigeMap.cities.get(vertex.hashCode());
    if (!city) throw new Error('No city at vertex');

    const level = city.level;
    const cost = this.upgradeCityCost(level);
    if (civState.getCivilizationPoints() < cost) {
      throw new Error('Not enough civilization points');
    }

    city.upgrade();
    civState.setCivilizationPoints(civState.getCivilizationPoints() - cost);
  }

  /** Agrège les bonus pour une ville: bonus propre + (niveau * bonus des hexagones adjacents). */
  static computeCityBonuses(prestigeMap: PrestigeMap, city: PrestigeCity): Map<PrestigeBonusType, number> {
    const totals = new Map<PrestigeBonusType, number>();
    // city own bonus
    if (city.bonus) {
      totals.set(city.bonus.type, (totals.get(city.bonus.type) ?? 0) + city.bonus.value);
    }
    // surrounding hexes
    const hexes = city.vertex.getHexes();
    for (const hexCoord of hexes) {
      const b = prestigeMap.bonuses.get(hexCoord.hashCode());
      if (!b) continue;
      const prev = totals.get(b.type) ?? 0;
      totals.set(b.type, prev + b.value * city.level);
    }
    return totals;
  }
}
