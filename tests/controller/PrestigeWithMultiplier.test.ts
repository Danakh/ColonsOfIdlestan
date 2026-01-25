import { expect, test } from 'vitest';
import { IslandMap } from '../../src/model/map/IslandMap';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { HexGrid } from '../../src/model/hex/HexGrid';
import { Hex } from '../../src/model/hex/Hex';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { CityLevel } from '../../src/model/city/CityLevel';
import { PrestigeController } from '../../src/controller/PrestigeController';
import { calculateCivilizationPoints } from '../../src/model/game/CivilizationPoints';
import { IslandState } from '../../src/model/game/IslandState';
import { CivilizationState } from '../../src/model/game/CivilizationState';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { GameClock } from '../../src/model/game/GameClock';

test('prestige applies civ point multiplier', () => {
  // Build multiple towns to reach >=20 civilization points
  const hexes = [];
  const civId = CivilizationId.create('player1');

  for (let i = 0; i < 10; i++) {
    const center = new HexCoord(i * 2, 0);
    const north = center.neighbor(HexDirection.SW);
    const northeast = center.neighbor(HexDirection.SE);
    hexes.push(new Hex(center), new Hex(north), new Hex(northeast));
  }

  const grid = new HexGrid(hexes);
  let map = new IslandMap(grid);
  map.registerCivilization(civId);

  // Add 10 towns (level 2) -> 20 points
  for (let i = 0; i < 10; i++) {
    const center = new HexCoord(i * 2, 0);
    const north = center.neighbor(HexDirection.SW);
    const northeast = center.neighbor(HexDirection.SE);
    const vertex = Vertex.create(center, north, northeast);
    map.addCity(vertex, civId, CityLevel.Town);
  }

  // Add one capital somewhere to satisfy the capital requirement
  const capCenter = new HexCoord(100, 0);
  const capNorth = capCenter.neighbor(HexDirection.SW);
  const capNortheast = capCenter.neighbor(HexDirection.SE);
  // ensure hexes exist in the grid (push them into the map via new grid construction would be required),
  // but to keep test simple, add these hexes into the grid by creating a new HexGrid with cap hexes appended
  // Recreate grid and map to include the capital hexes
  const extraHexes = [new Hex(capCenter), new Hex(capNorth), new Hex(capNortheast)];
  // rebuild grid with previous hexes + extra
  const allHexes = grid.getAllHexes().concat(extraHexes);
  const newGrid = new HexGrid(allHexes);
  const newMap = new IslandMap(newGrid);
  newMap.registerCivilization(civId);
  // migrate existing cities into newMap
  for (const city of map.getCitiesByCivilization(civId)) {
    newMap.addCity(city.vertex, civId, city.level);
  }
  // add the capital
  const capVertex = Vertex.create(capCenter, capNorth, capNortheast);
  newMap.addCity(capVertex, civId, CityLevel.Capital);
  // replace map with newMap for the rest of the test
  map = newMap;

  const base = calculateCivilizationPoints(map, civId);
  expect(base).toBeGreaterThanOrEqual(20);

  // Create IslandState with the map
  const resources = new PlayerResources();
  const clock = new GameClock();
  const islandState = new IslandState(resources, civId, clock);
  islandState.setIslandMap(map);
  islandState.setCivilizations([civId]);

  // Set civ point gain level to 10 for 2x multiplier (1 + 0.1*10 = 2)
  const civ = islandState.getCivilization(civId);
  civ.setCivPointGainLevel(10);

  const civState = new CivilizationState(islandState, islandState.getGameClock());
  const multiplier = civ.getCivPointGainMultiplier(); // Should be 2
  const res = PrestigeController.activatePrestige(civState);
  expect(res.success).toBe(true);
  expect(res.civilizationPointsGained).toBe(Math.floor(base * multiplier));
  // Vérifier que les points ont été ajoutés
  expect(civState.getPrestigePointsTotal()).toBe(res.civilizationPointsGained);
  // Vérifier que l'IslandState a été détruit
  expect(civState.getIslandState().getIslandMap()).toBeNull();
});
