import { describe, it, expect } from 'vitest';
import { calculateCivilizationPoints, hasLibrary } from '../../../src/model/game/CivilizationPoints';
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

describe('CivilizationPoints', () => {
  describe('calculateCivilizationPoints', () => {
    it('devrait retourner 0 pour un outpost (niveau 0)', () => {
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
      map.addCity(vertex, civId); // Outpost (niveau 0)

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(0); // Outpost = 0 points
    });

    it('devrait retourner 1 pour une colonie (niveau 1)', () => {
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

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(1); // Colony = 1 point
    });

    it('devrait retourner 2 pour une ville (niveau 2)', () => {
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

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(2); // Town = 2 points
    });

    it('devrait retourner 3 pour une métropole (niveau 3)', () => {
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

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(3); // Metropolis = 3 points
    });

    it('devrait retourner 4 pour une capitale (niveau 4)', () => {
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

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(4); // Capital = 4 points
    });

    it('devrait ajouter 1 point par bibliothèque', () => {
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
      map.addCity(vertex, civId, CityLevel.Town); // Niveau 2 = 2 points

      const city = map.getCity(vertex);
      expect(city).toBeTruthy();

      // Construire une bibliothèque
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 6);
      resources.addResource(ResourceType.Brick, 4);
      resources.addResource(ResourceType.Sheep, 10);
      BuildingController.buildBuilding(BuildingType.Library, city!, map, vertex, resources);

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(3); // 2 (ville) + 1 (bibliothèque) = 3
    });

    it('devrait compter plusieurs bibliothèques dans différentes villes', () => {
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
      map.addCity(vertex1, civId, CityLevel.Town); // Niveau 2 = 2 points
      map.addCity(vertex2, civId, CityLevel.Town); // Niveau 2 = 2 points (Library nécessite Town)

      const city1 = map.getCity(vertex1);
      const city2 = map.getCity(vertex2);
      expect(city1).toBeTruthy();
      expect(city2).toBeTruthy();

      // Construire une bibliothèque dans chaque ville
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 12);
      resources.addResource(ResourceType.Brick, 8);
      resources.addResource(ResourceType.Sheep, 20);
      BuildingController.buildBuilding(BuildingType.Library, city1!, map, vertex1, resources);
      BuildingController.buildBuilding(BuildingType.Library, city2!, map, vertex2, resources);

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(6); // 2 (ville1) + 2 (ville2) + 1 (bibliothèque1) + 1 (bibliothèque2) = 6
    });

    it('devrait retourner 0 si aucune ville n\'existe', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      const map = new IslandMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(0);
    });
  });

  describe('hasLibrary', () => {
    it('devrait retourner false si aucune bibliothèque n\'existe', () => {
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
      map.addCity(vertex, civId, CityLevel.Town);

      expect(hasLibrary(map, civId)).toBe(false);
    });

    it('devrait retourner true si au moins une bibliothèque existe', () => {
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
      map.addCity(vertex, civId, CityLevel.Town);

      const city = map.getCity(vertex);
      expect(city).toBeTruthy();

      // Construire une bibliothèque
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 6);
      resources.addResource(ResourceType.Brick, 4);
      resources.addResource(ResourceType.Sheep, 10);
      BuildingController.buildBuilding(BuildingType.Library, city!, map, vertex, resources);

      expect(hasLibrary(map, civId)).toBe(true);
    });
  });

  describe('Temple', () => {
    it('devrait ajouter 1 point de civilisation par temple', () => {
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
      map.addCity(vertex, civId, CityLevel.Metropolis); // Niveau 3 = 3 points

      const city = map.getCity(vertex);
      expect(city).toBeTruthy();

      // Construire un temple
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 8);
      resources.addResource(ResourceType.Brick, 10);
      resources.addResource(ResourceType.Ore, 5);
      resources.addResource(ResourceType.Wheat, 10);
      BuildingController.buildBuilding(BuildingType.Temple, city!, map, vertex, resources);

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(4); // 3 (métropole) + 1 (temple) = 4
    });

    it('devrait être disponible seulement au niveau Metropolis (3) ou supérieur', () => {
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

      // Tester avec Town (niveau 2) - ne devrait pas pouvoir construire
      const vertex1 = Vertex.create(center, north, northeast);
      map.addCity(vertex1, civId, CityLevel.Town);
      const city1 = map.getCity(vertex1);
      expect(city1).toBeTruthy();

      const resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 8);
      resources.addResource(ResourceType.Brick, 10);
      resources.addResource(ResourceType.Ore, 5);
      resources.addResource(ResourceType.Wheat, 10);

      expect(() => {
        BuildingController.buildBuilding(BuildingType.Temple, city1!, map, vertex1, resources);
      }).toThrow();

      // Tester avec Metropolis (niveau 3) - devrait pouvoir construire
      const southeast = center.neighbor(HexDirection.E);
      const grid2 = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(southeast),
      ]);
      const map2 = new IslandMap(grid2);
      map2.registerCivilization(civId);
      const vertex2 = Vertex.create(center, northeast, southeast);
      map2.addCity(vertex2, civId, CityLevel.Metropolis);
      const city2 = map2.getCity(vertex2);
      expect(city2).toBeTruthy();

      BuildingController.buildBuilding(BuildingType.Temple, city2!, map2, vertex2, resources);
      expect(city2!.hasBuilding(BuildingType.Temple)).toBe(true);
    });

    it('devrait compter les temples et bibliothèques ensemble', () => {
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
      map.addCity(vertex, civId, CityLevel.Metropolis); // Niveau 3 = 3 points

      const city = map.getCity(vertex);
      expect(city).toBeTruthy();

      // Construire une bibliothèque
      let resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 6);
      resources.addResource(ResourceType.Brick, 4);
      resources.addResource(ResourceType.Sheep, 10);
      BuildingController.buildBuilding(BuildingType.Library, city!, map, vertex, resources);

      // Construire un temple
      resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 8);
      resources.addResource(ResourceType.Brick, 10);
      resources.addResource(ResourceType.Ore, 5);
      resources.addResource(ResourceType.Wheat, 10);
      BuildingController.buildBuilding(BuildingType.Temple, city!, map, vertex, resources);

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(5); // 3 (métropole) + 1 (bibliothèque) + 1 (temple) = 5
    });
  });
});

