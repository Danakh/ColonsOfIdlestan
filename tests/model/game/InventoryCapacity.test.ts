import { describe, it, expect } from 'vitest';
import { calculateInventoryCapacity } from '../../../src/model/game/InventoryCapacity';
import { IslandMap } from '../../../src/model/map/IslandMap';
import { CivilizationId } from '../../../src/model/map/CivilizationId';
import { HexGrid } from '../../../src/model/hex/HexGrid';
import { Hex } from '../../../src/model/hex/Hex';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection } from '../../../src/model/hex/HexDirection';
import { Vertex } from '../../../src/model/hex/Vertex';
import { CityLevel } from '../../../src/model/city/CityLevel';
import { BuildingType } from '../../../src/model/city/BuildingType';
import { BuildingController } from '../../../src/controller/BuildingController';
import { PlayerResources } from '../../../src/model/game/PlayerResources';
import { ResourceType } from '../../../src/model/map/ResourceType';

describe('InventoryCapacity', () => {
  describe('calculateInventoryCapacity', () => {
    it('devrait retourner 10 pour un outpost (niveau 0)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId); // Outpost par défaut (niveau 0)

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(10); // 10 * (0+1)² = 10
    });

    it('devrait retourner 40 pour une colonie (niveau 1)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Colony); // Niveau 1

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(40); // 10 * (1+1)² = 40
    });

    it('devrait retourner 90 pour une ville (niveau 2)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Town); // Niveau 2

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(90); // 10 * (2+1)² = 90
    });

    it('devrait retourner 160 pour une métropole (niveau 3)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Metropolis); // Niveau 3

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(160); // 10 * (3+1)² = 160
    });

    it('devrait retourner 250 pour une capitale (niveau 4)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Capital); // Niveau 4

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(250); // 10 * (4+1)² = 250
    });

    it('devrait ajouter 500 par entrepôt', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Town); // Niveau 2 = 90 de base

      const city = map.getCity(vertex);
      expect(city).toBeTruthy();

      // Construire un entrepôt
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 10);
      resources.addResource(ResourceType.Brick, 10);
      BuildingController.buildBuilding(BuildingType.Warehouse, city!, map, vertex, resources);

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(590); // 90 (base) + 500 (entrepôt) = 590
    });

    it('devrait ajouter 500 par entrepôt dans plusieurs villes', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      const southeast = center.neighbor(HexDirection.E);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(southeast),
      ]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex1 = Vertex.create(center, north, northeast);
      const vertex2 = Vertex.create(center, northeast, southeast);
      map.addCity(vertex1, civId, CityLevel.Town); // Niveau 2 = 90 de base
      map.addCity(vertex2, civId, CityLevel.Town);

      const city1 = map.getCity(vertex1);
      const city2 = map.getCity(vertex2);
      expect(city1).toBeTruthy();
      expect(city2).toBeTruthy();

      // Construire un entrepôt dans chaque ville
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 20);
      resources.addResource(ResourceType.Brick, 20);
      BuildingController.buildBuilding(BuildingType.Warehouse, city1!, map, vertex1, resources);
      resources.addResource(ResourceType.Wood, 10);
      resources.addResource(ResourceType.Brick, 10);
      BuildingController.buildBuilding(BuildingType.Warehouse, city2!, map, vertex2, resources);

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(1090); // 90 (base) + 500 (entrepôt 1) + 500 (entrepôt 2) = 1090
    });

    it('devrait utiliser le niveau de ville le plus élevé parmi plusieurs villes', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      const southeast = center.neighbor(HexDirection.E);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(southeast),
      ]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex1 = Vertex.create(center, north, northeast);
      const vertex2 = Vertex.create(center, northeast, southeast);
      map.addCity(vertex1, civId, CityLevel.Colony); // Niveau 1 = 40
      map.addCity(vertex2, civId, CityLevel.Metropolis); // Niveau 3 = 160

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(160); // Utilise le niveau le plus élevé (Metropolis)
    });

    it('devrait retourner 10 si aucune ville n\'existe', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const capacity = calculateInventoryCapacity(map, civId);
      expect(capacity).toBe(10); // Capacité de base pour outpost (niveau 0)
    });
  });
});

