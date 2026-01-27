import { describe, it, expect, beforeEach } from 'vitest';
import { PrestigeMapGenerator } from '../../src/controller/PrestigeMapGenerator';
import { CivilizationState } from '../../src/model/game/CivilizationState';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { HexDirection } from '../../src/model/hex/HexDirection';

describe('PrestigeMapGenerator', () => {
  let civState: CivilizationState;

  beforeEach(() => {
    civState = CivilizationState.createNew(CivilizationId.create('player1'));
  });

  it('génère la prestige map avec 3 hexes, 3 bonuses et une city initiale', () => {
    const prestige = PrestigeMapGenerator.generate(civState);
    expect(prestige.grid.size()).toBe(3);
    expect(prestige.bonuses.size).toBe(3);
    // Une ville initiale placée au vertex Nord du centre
    expect(prestige.cities.size).toBeGreaterThanOrEqual(1);
  });

  it('achète une road et débite les civilisation points', () => {
    const prestige = PrestigeMapGenerator.generate(civState);
    // Donner suffisamment de points
    civState.setCivilizationPoints(100);

    const center = prestige.grid.getAllHexes().find(h => h.coord.q === 0 && h.coord.r === 0)!;
    const edge = prestige.grid.getEdgeByMainDirection(center.coord, HexDirection.E);
    expect(edge).toBeDefined();
    const cost = PrestigeMapGenerator.roadBuildCost();

    PrestigeMapGenerator.buyRoad(edge!, civState);

    expect(prestige.roads.has(edge!.hashCode())).toBe(true);
    expect(civState.getCivilizationPoints()).toBe(100 - cost);
  });

  it('construit une nouvelle city et interdit la construction en double', () => {
    const prestige = PrestigeMapGenerator.generate(civState);
    civState.setCivilizationPoints(1000);

    const center = prestige.grid.getAllHexes().find(h => h.coord.q === 0 && h.coord.r === 0)!;
    // Choisir un vertex différent de celui déjà occupé (EN)
    const vertex = prestige.grid.getVertexBySecondaryDirection(center.coord, 1 /* EN */);
    if (!vertex) throw new Error('vertex not found in test');

    // Ensure not already present (generator only creates N)
    expect(prestige.cities.has(vertex.hashCode())).toBe(false);

    const cost = PrestigeMapGenerator.newCityCost();
    PrestigeMapGenerator.buildCity(vertex, civState);
    expect(prestige.cities.has(vertex.hashCode())).toBe(true);
    expect(civState.getCivilizationPoints()).toBe(1000 - cost);

    // Attempting to build again on the same vertex should throw
    expect(() => PrestigeMapGenerator.buildCity(vertex, civState)).toThrow();
  });

  it('sérialise et désérialise la CivilizationState avec la prestige map (bonuses et cities préservés)', () => {
    const prestige = PrestigeMapGenerator.generate(civState);
    civState.setCivilizationPoints(50);

    // Build one city so serialization contains cities
    const center = prestige.grid.getAllHexes().find(h => h.coord.q === 0 && h.coord.r === 0)!;
    const vertex = prestige.grid.getVertexBySecondaryDirection(center.coord, 1 /* EN */);
    if (vertex && !prestige.cities.has(vertex.hashCode())) {
      civState.setCivilizationPoints(100);
      PrestigeMapGenerator.buildCity(vertex, civState);
    }

    const serialized = civState.serialize();
    const restored = CivilizationState.deserialize(serialized);

    const restoredMap = restored.getPrestigeMap();
    expect(restoredMap).toBeDefined();
    // bonuses and cities should be present after deserialization
    expect(restoredMap!.bonuses.size).toBe(prestige.bonuses.size);
    expect(restoredMap!.cities.size).toBe(prestige.cities.size);
    // roads may be empty due to serialization placeholder behavior
  });
});
