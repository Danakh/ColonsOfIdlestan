import { describe, it, expect } from 'vitest';
import { calculateCivilizationPoints, hasLibrary } from '../../../src/model/game/CivilizationPoints';
import { GameMap } from '../../../src/model/map/GameMap';
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
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId); // Outpost (niveau 0)

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(0); // Outpost = 0 points
    });

    it('devrait retourner 1 pour une colonie (niveau 1)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Colony); // Niveau 1

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(1); // Colony = 1 point
    });

    it('devrait retourner 2 pour une ville (niveau 2)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Town); // Niveau 2

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(2); // Town = 2 points
    });

    it('devrait retourner 3 pour une métropole (niveau 3)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Metropolis); // Niveau 3

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(3); // Metropolis = 3 points
    });

    it('devrait retourner 4 pour une capitale (niveau 4)', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Capital); // Niveau 4

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(4); // Capital = 4 points
    });

    it('devrait ajouter 1 point par bibliothèque', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
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
      resources.addResource(ResourceType.Sheep, 6);
      BuildingController.buildBuilding(BuildingType.Library, city!, map, vertex, resources);

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(3); // 2 (ville) + 1 (bibliothèque) = 3
    });

    it('devrait compter plusieurs bibliothèques dans différentes villes', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const southeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(southeast),
      ]);
      const map = new GameMap(grid);
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
      resources.addResource(ResourceType.Sheep, 12);
      BuildingController.buildBuilding(BuildingType.Library, city1!, map, vertex1, resources);
      BuildingController.buildBuilding(BuildingType.Library, city2!, map, vertex2, resources);

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(6); // 2 (ville1) + 2 (ville2) + 1 (bibliothèque1) + 1 (bibliothèque2) = 6
    });

    it('devrait retourner 0 si aucune ville n\'existe', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const points = calculateCivilizationPoints(map, civId);
      expect(points).toBe(0);
    });
  });

  describe('hasLibrary', () => {
    it('devrait retourner false si aucune bibliothèque n\'existe', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId, CityLevel.Town);

      expect(hasLibrary(map, civId)).toBe(false);
    });

    it('devrait retourner true si au moins une bibliothèque existe', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
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
      resources.addResource(ResourceType.Sheep, 6);
      BuildingController.buildBuilding(BuildingType.Library, city!, map, vertex, resources);

      expect(hasLibrary(map, civId)).toBe(true);
    });
  });
});
