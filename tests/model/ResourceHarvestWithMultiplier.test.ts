import { expect, test } from 'vitest';
import { IslandMap } from '../../src/model/map/IslandMap';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { GameClock } from '../../src/model/game/GameClock';
import { HexGrid } from '../../src/model/hex/HexGrid';
import { Hex } from '../../src/model/hex/Hex';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { ResourceHarvest } from '../../src/model/game/ResourceHarvest';
import { ResourceType } from '../../src/model/map/ResourceType';
import { HexType } from '../../src/model/map/HexType';

test('resource harvest applies multiplier (floored)', () => {
  const center = new HexCoord(0, 0);
  const north = center.neighbor(HexDirection.SW);
  const northeast = center.neighbor(HexDirection.SE);
  const grid = new HexGrid([
    new Hex(center),
    new Hex(north),
    new Hex(northeast),
  ]);
  const map = new IslandMap(grid);
  const civId = CivilizationId.create('player1');
  map.registerCivilization(civId);

  // set wood on center and add a city adjacent to it
  map.setHexType(center, HexType.Wood);
  const vertex = Vertex.create(center, north, northeast);
  map.addCity(vertex, civId);

  const hex = grid.getAllHexes()[0];

  const playerResources = new PlayerResources();
  const before = playerResources.getResource(ResourceType.Wood);

  // multiplier 1.5 should result in floor(1 * 1.5) = 1
  const result = ResourceHarvest.harvest(hex.coord, map, civId, playerResources, undefined, 1.5);
  expect(result.gain).toBe(1);

  // multiplier 2 should result in floor(1 * 2) = 2
  const result2 = ResourceHarvest.harvest(hex.coord, map, civId, playerResources, undefined, 2);
  expect(result2.gain).toBe(2);
});
