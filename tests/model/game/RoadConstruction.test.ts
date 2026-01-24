import { describe, it, expect, beforeEach } from 'vitest';
import { RoadConstruction } from '../../../src/model/game/RoadConstruction';
import { RoadController } from '../../../src/controller/RoadController';
import { Edge } from '../../../src/model/hex/Edge';
import { Vertex } from '../../../src/model/hex/Vertex';
import { GameMap } from '../../../src/model/map/GameMap';
import { CivilizationId } from '../../../src/model/map/CivilizationId';
import { ResourceType } from '../../../src/model/map/ResourceType';
import { PlayerResources } from '../../../src/model/game/PlayerResources';
import { HexGrid } from '../../../src/model/hex/HexGrid';
import { Hex } from '../../../src/model/hex/Hex';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { MainHexDirection } from '../../../src/model/hex/MainHexDirection';

describe('RoadConstruction', () => {
  describe('canBuildRoad', () => {
    it('devrait retourner true si l\'edge touche une ville de la même civilisation', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Ajouter une ville sur un vertex
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      // L'edge (center, north) devrait toucher la ville
      const edge = Edge.create(center, north);

      expect(RoadConstruction.canBuildRoad(edge, civId, map)).toBe(true);
    });

    it('devrait retourner false si l\'edge touche une ville d\'une autre civilisation', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId1 = CivilizationId.create('civ1');
      const civId2 = CivilizationId.create('civ2');
      map.registerCivilization(civId1);
      map.registerCivilization(civId2);

      // Ajouter une ville de civ1 sur un vertex
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId1);

      // L'edge (center, north) ne devrait pas être constructible par civ2
      const edge = Edge.create(center, north);

      expect(RoadConstruction.canBuildRoad(edge, civId2, map)).toBe(false);
    });

    it('devrait retourner true si l\'edge touche une route de la même civilisation', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Construire une première route
      const edge1 = Edge.create(center, north);
      map.addRoad(edge1, civId);

      // L'edge (center, northeast) devrait toucher la route existante
      const edge2 = Edge.create(center, northeast);

      expect(RoadConstruction.canBuildRoad(edge2, civId, map)).toBe(true);
    });

    it('devrait retourner false si l\'edge touche une route d\'une autre civilisation', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId1 = CivilizationId.create('civ1');
      const civId2 = CivilizationId.create('civ2');
      map.registerCivilization(civId1);
      map.registerCivilization(civId2);

      // Construire une route de civ1
      const edge1 = Edge.create(center, north);
      map.addRoad(edge1, civId1);

      // L'edge (center, northeast) ne devrait pas être constructible par civ2
      const edge2 = Edge.create(center, northeast);

      expect(RoadConstruction.canBuildRoad(edge2, civId2, map)).toBe(false);
    });

    it('devrait retourner false si l\'edge n\'a ni ville ni route adjacente', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const isolated = new HexCoord(10, 10);
      const isolatedNeighbor = isolated.neighborMain(MainHexDirection.SW);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(isolated),
        new Hex(isolatedNeighbor),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Un edge isolé ne devrait pas être constructible
      const edge = Edge.create(isolated, isolatedNeighbor);

      expect(RoadConstruction.canBuildRoad(edge, civId, map)).toBe(false);
    });

    it('devrait retourner false si une route existe déjà sur l\'edge', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const edge = Edge.create(center, north);
      map.addRoad(edge, civId);

      expect(RoadConstruction.canBuildRoad(edge, civId, map)).toBe(false);
    });

    it('devrait retourner false si la civilisation n\'est pas enregistrée', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');

      const edge = Edge.create(center, north);

      expect(RoadConstruction.canBuildRoad(edge, civId, map)).toBe(false);
    });
  });

  describe('canAfford', () => {
    it('devrait retourner true si le joueur a assez de ressources (distance par défaut)', () => {
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Brick, 1);
      resources.addResource(ResourceType.Wood, 1);

      expect(RoadConstruction.canAfford(resources)).toBe(true);
    });

    it('devrait retourner true si le joueur a assez de ressources pour distance 1', () => {
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Brick, 2);
      resources.addResource(ResourceType.Wood, 2);

      expect(RoadConstruction.canAfford(resources, 1)).toBe(true);
    });

    it('devrait retourner true si le joueur a plus de ressources que nécessaire', () => {
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Brick, 5);
      resources.addResource(ResourceType.Wood, 5);

      expect(RoadConstruction.canAfford(resources)).toBe(true);
    });

    it('devrait retourner false si le joueur n\'a pas assez d\'argile', () => {
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Wood, 1);

      expect(RoadConstruction.canAfford(resources)).toBe(false);
    });

    it('devrait retourner false si le joueur n\'a pas assez de bois', () => {
      const resources = new PlayerResources();
      resources.addResource(ResourceType.Brick, 1);

      expect(RoadConstruction.canAfford(resources)).toBe(false);
    });

    it('devrait retourner false si le joueur n\'a aucune ressource', () => {
      const resources = new PlayerResources();

      expect(RoadConstruction.canAfford(resources)).toBe(false);
    });
  });

  describe('buildRoad', () => {
    it('devrait construire une route si toutes les conditions sont remplies', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Ajouter une ville
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      const resources = new PlayerResources();
      // Le coût est multiplié par 2^distance, donc distance 1 = coût × 2
      resources.addResource(ResourceType.Brick, 2);
      resources.addResource(ResourceType.Wood, 2);

      const edge = Edge.create(center, north);

      RoadController.buildRoad(edge, civId, map, resources);

      expect(map.hasRoad(edge)).toBe(true);
      expect(map.getRoadOwner(edge)).toEqual(civId);
      expect(resources.getResource(ResourceType.Brick)).toBe(0);
      expect(resources.getResource(ResourceType.Wood)).toBe(0);
    });

    it('devrait lancer une erreur si l\'edge ne peut pas être construit', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const isolated = new HexCoord(10, 10);
      const isolatedNeighbor = isolated.neighborMain(MainHexDirection.SW);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(isolated),
        new Hex(isolatedNeighbor),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const resources = new PlayerResources();
      resources.addResource(ResourceType.Brick, 1);
      resources.addResource(ResourceType.Wood, 1);

      const edge = Edge.create(isolated, isolatedNeighbor);

      expect(() => {
        RoadController.buildRoad(edge, civId, map, resources);
      }).toThrow();
    });

    it('devrait lancer une erreur si le joueur n\'a pas assez de ressources', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Ajouter une ville
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      const resources = new PlayerResources();
      // Pas assez de ressources

      const edge = Edge.create(center, north);

      expect(() => {
        RoadController.buildRoad(edge, civId, map, resources);
      }).toThrow();
    });

    it('devrait construire une route connectée à une autre route', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Ajouter une ville pour permettre la construction de la première route
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      // Construire une première route (connectée à la ville, distance = 1, coût × 2^1 = 2)
      const edge1 = Edge.create(center, north);
      const resources1 = new PlayerResources();
      resources1.addResource(ResourceType.Brick, 2);
      resources1.addResource(ResourceType.Wood, 2);
      RoadController.buildRoad(edge1, civId, map, resources1);

      // Construire une deuxième route connectée à la première (distance = 2, coût × 2^2 = 4)
      const edge2 = Edge.create(center, northeast);
      const resources2 = new PlayerResources();
      resources2.addResource(ResourceType.Brick, 4);
      resources2.addResource(ResourceType.Wood, 4);

      RoadController.buildRoad(edge2, civId, map, resources2);

      expect(map.hasRoad(edge2)).toBe(true);
      expect(map.getRoadOwner(edge2)).toEqual(civId);
    });

    it('devrait retirer les ressources correctes', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Ajouter une ville
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      const resources = new PlayerResources();
      // Route à distance 1, donc coût = 2^1 × (1 Brick + 1 Wood) = 2 Brick + 2 Wood
      resources.addResource(ResourceType.Brick, 3);
      resources.addResource(ResourceType.Wood, 5);
      resources.addResource(ResourceType.Ore, 10); // Ressource qui ne devrait pas être affectée

      const edge = Edge.create(center, north);

      RoadController.buildRoad(edge, civId, map, resources);

      // 3 - 2 = 1, 5 - 2 = 3
      expect(resources.getResource(ResourceType.Brick)).toBe(1);
      expect(resources.getResource(ResourceType.Wood)).toBe(3);
      expect(resources.getResource(ResourceType.Ore)).toBe(10);
    });
  });

  describe('getCost', () => {
    it('devrait retourner le coût de base (distance undefined = 0)', () => {
      const cost = RoadConstruction.getCost();

      expect(cost.get(ResourceType.Brick)).toBe(1);
      expect(cost.get(ResourceType.Wood)).toBe(1);
      expect(cost.size).toBe(2);
    });

    it('devrait retourner le coût multiplié par 2^distance pour distance 1', () => {
      const cost = RoadConstruction.getCost(1);

      expect(cost.get(ResourceType.Brick)).toBe(2);
      expect(cost.get(ResourceType.Wood)).toBe(2);
      expect(cost.size).toBe(2);
    });

    it('devrait retourner le coût multiplié par 2^distance pour distance 2', () => {
      const cost = RoadConstruction.getCost(2);

      expect(cost.get(ResourceType.Brick)).toBe(4);
      expect(cost.get(ResourceType.Wood)).toBe(4);
      expect(cost.size).toBe(2);
    });

    it('devrait retourner le coût multiplié par 2^distance pour distance 3', () => {
      const cost = RoadConstruction.getCost(3);

      expect(cost.get(ResourceType.Brick)).toBe(8);
      expect(cost.get(ResourceType.Wood)).toBe(8);
      expect(cost.size).toBe(2);
    });
  });
});
