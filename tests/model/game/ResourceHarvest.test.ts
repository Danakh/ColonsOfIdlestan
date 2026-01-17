import { describe, it, expect } from 'vitest';
import { ResourceHarvest } from '../../../src/model/game/ResourceHarvest';
import { PlayerResources } from '../../../src/model/game/PlayerResources';
import { GameMap } from '../../../src/model/map/GameMap';
import { ResourceType } from '../../../src/model/map/ResourceType';
import { CivilizationId } from '../../../src/model/map/CivilizationId';
import { HexGrid } from '../../../src/model/hex/HexGrid';
import { Hex } from '../../../src/model/hex/Hex';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection } from '../../../src/model/hex/HexDirection';
import { Vertex } from '../../../src/model/hex/Vertex';
import { Edge } from '../../../src/model/hex/Edge';

describe('ResourceHarvest', () => {
  describe('calculateGain', () => {
    it('devrait retourner 1 pour les ressources récoltables', () => {
      expect(ResourceHarvest.calculateGain(ResourceType.Wood)).toBe(1);
      expect(ResourceHarvest.calculateGain(ResourceType.Brick)).toBe(1);
      expect(ResourceHarvest.calculateGain(ResourceType.Wheat)).toBe(1);
      expect(ResourceHarvest.calculateGain(ResourceType.Sheep)).toBe(1);
      expect(ResourceHarvest.calculateGain(ResourceType.Ore)).toBe(1);
    });

    it('devrait retourner 0 pour les ressources non récoltables', () => {
      expect(ResourceHarvest.calculateGain(ResourceType.Desert)).toBe(0);
      expect(ResourceHarvest.calculateGain(ResourceType.Water)).toBe(0);
    });
  });

  describe('isAdjacentToPlayerCity', () => {
    it('devrait retourner true si un hexagone est adjacent à une ville du joueur', () => {
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

      // Ajouter une ville sur le vertex (center, north, northeast)
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      // L'hexagone center devrait être adjacent à la ville
      expect(
        ResourceHarvest.isAdjacentToPlayerCity(center, map, civId)
      ).toBe(true);
      // Les autres hexagones du vertex aussi
      expect(
        ResourceHarvest.isAdjacentToPlayerCity(north, map, civId)
      ).toBe(true);
      expect(
        ResourceHarvest.isAdjacentToPlayerCity(northeast, map, civId)
      ).toBe(true);
    });

    it('devrait retourner false si un hexagone n\'est pas adjacent à une ville du joueur', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const isolated = new HexCoord(10, 10);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(isolated),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Ajouter une ville sur le vertex (center, north, northeast)
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      // L'hexagone isolé ne devrait pas être adjacent
      expect(
        ResourceHarvest.isAdjacentToPlayerCity(isolated, map, civId)
      ).toBe(false);
    });

    it('devrait retourner false si la ville appartient à une autre civilisation', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

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

      // Ajouter une ville appartenant à civ1
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId1);

      // civ2 ne devrait pas pouvoir récolter
      expect(
        ResourceHarvest.isAdjacentToPlayerCity(center, map, civId2)
      ).toBe(false);
    });

    it('devrait retourner true si l\'hexagone est adjacent à plusieurs villes du joueur', () => {
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

      // Ajouter deux villes adjacentes à center
      const vertex1 = Vertex.create(center, north, northeast);
      const vertex2 = Vertex.create(center, northeast, southeast);
      map.addCity(vertex1, civId);
      map.addCity(vertex2, civId);

      // center devrait être adjacent aux deux villes
      expect(
        ResourceHarvest.isAdjacentToPlayerCity(center, map, civId)
      ).toBe(true);
    });
  });

  describe('canHarvest', () => {
    it('devrait retourner true si toutes les conditions sont remplies', () => {
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

      // Ajouter une ville et définir une ressource récoltable
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);
      map.setResource(center, ResourceType.Wood);

      // center devrait être récoltable
      expect(ResourceHarvest.canHarvest(center, map, civId)).toBe(true);
    });

    it('devrait retourner false si l\'hexagone n\'existe pas dans la grille', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const nonExistent = new HexCoord(10, 10);
      expect(ResourceHarvest.canHarvest(nonExistent, map, civId)).toBe(false);
    });

    it('devrait retourner false si l\'hexagone n\'est pas visible', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      map.setResource(center, ResourceType.Wood);

      // Sans ville ou route, l'hexagone n'est pas visible
      expect(ResourceHarvest.canHarvest(center, map, civId)).toBe(false);
    });

    it('devrait retourner false si l\'hexagone n\'est pas adjacent à une ville du joueur', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const isolated = new HexCoord(10, 10);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(isolated),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Ajouter une ville loin de isolated
      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      // Rendre isolated visible avec une route
      const isolatedNorth = isolated.neighbor(HexDirection.N);
      const grid2 = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(isolated),
        new Hex(isolatedNorth),
      ]);
      const map2 = new GameMap(grid2);
      map2.registerCivilization(civId);
      map2.addCity(vertex, civId);
      map2.setResource(isolated, ResourceType.Wood);
      const edge = Edge.create(isolated, isolatedNorth);
      map2.addRoad(edge, civId);

      // isolated est visible mais pas adjacent à une ville
      expect(ResourceHarvest.canHarvest(isolated, map2, civId)).toBe(false);
    });

    it('devrait retourner false si l\'hexagone contient une ressource non récoltable', () => {
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
      map.addCity(vertex, civId);

      // Tester avec Desert
      map.setResource(center, ResourceType.Desert);
      expect(ResourceHarvest.canHarvest(center, map, civId)).toBe(false);

      // Tester avec Water
      map.setResource(center, ResourceType.Water);
      expect(ResourceHarvest.canHarvest(center, map, civId)).toBe(false);
    });

    it('devrait retourner true pour toutes les ressources récoltables', () => {
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
      map.addCity(vertex, civId);

      const harvestableResources = [
        ResourceType.Wood,
        ResourceType.Brick,
        ResourceType.Wheat,
        ResourceType.Sheep,
        ResourceType.Ore,
      ];

      for (const resource of harvestableResources) {
        map.setResource(center, resource);
        expect(ResourceHarvest.canHarvest(center, map, civId)).toBe(true);
      }
    });
  });

  describe('harvest', () => {
    it('devrait récolter une ressource et l\'ajouter à l\'inventaire', () => {
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
      map.addCity(vertex, civId);
      map.setResource(center, ResourceType.Wood);

      const playerResources = new PlayerResources();

      const gain = ResourceHarvest.harvest(center, map, civId, playerResources);

      expect(gain).toBe(1);
      expect(playerResources.getResource(ResourceType.Wood)).toBe(1);
    });

    it('devrait accumuler les ressources lors de plusieurs récoltes', () => {
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
      map.addCity(vertex, civId);
      map.setResource(center, ResourceType.Wood);

      const playerResources = new PlayerResources();

      // Récolter plusieurs fois
      ResourceHarvest.harvest(center, map, civId, playerResources);
      ResourceHarvest.harvest(center, map, civId, playerResources);
      ResourceHarvest.harvest(center, map, civId, playerResources);

      expect(playerResources.getResource(ResourceType.Wood)).toBe(3);
    });

    it('devrait récolter différents types de ressources', () => {
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

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex, civId);

      const playerResources = new PlayerResources();

      // Récolter différentes ressources
      map.setResource(center, ResourceType.Wood);
      ResourceHarvest.harvest(center, map, civId, playerResources);

      map.setResource(north, ResourceType.Brick);
      ResourceHarvest.harvest(north, map, civId, playerResources);

      map.setResource(northeast, ResourceType.Wheat);
      ResourceHarvest.harvest(northeast, map, civId, playerResources);

      expect(playerResources.getResource(ResourceType.Wood)).toBe(1);
      expect(playerResources.getResource(ResourceType.Brick)).toBe(1);
      expect(playerResources.getResource(ResourceType.Wheat)).toBe(1);
    });

    it('devrait lancer une erreur si l\'hexagone ne peut pas être récolté', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      const playerResources = new PlayerResources();

      // Essayer de récolter un hexagone non visible
      expect(() => {
        ResourceHarvest.harvest(center, map, civId, playerResources);
      }).toThrow();
    });

    it('devrait lancer une erreur si l\'hexagone n\'est pas adjacent à une ville', () => {
      const center = new HexCoord(0, 0);
      const isolated = new HexCoord(10, 10);
      const isolatedNorth = isolated.neighbor(HexDirection.N);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(isolated),
        new Hex(isolatedNorth),
      ]);
      const map = new GameMap(grid);
      const civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Ajouter une ville loin de isolated
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const grid2 = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(isolated),
        new Hex(isolatedNorth),
      ]);
      const map2 = new GameMap(grid2);
      map2.registerCivilization(civId);
      const vertex = Vertex.create(center, north, northeast);
      map2.addCity(vertex, civId);

      // Rendre isolated visible mais pas adjacent
      map2.setResource(isolated, ResourceType.Wood);
      const edge = Edge.create(isolated, isolatedNorth);
      map2.addRoad(edge, civId);

      const playerResources = new PlayerResources();

      expect(() => {
        ResourceHarvest.harvest(isolated, map2, civId, playerResources);
      }).toThrow();
    });

    it('devrait lancer une erreur si l\'hexagone contient une ressource non récoltable', () => {
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
      map.addCity(vertex, civId);
      map.setResource(center, ResourceType.Desert);

      const playerResources = new PlayerResources();

      expect(() => {
        ResourceHarvest.harvest(center, map, civId, playerResources);
      }).toThrow();
    });

    it('devrait retourner 0 et ne pas ajouter de ressource si le gain est 0', () => {
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
      map.addCity(vertex, civId);
      map.setResource(center, ResourceType.Desert);

      const playerResources = new PlayerResources();

      // canHarvest devrait retourner false pour Desert, donc harvest devrait lancer une erreur
      expect(() => {
        ResourceHarvest.harvest(center, map, civId, playerResources);
      }).toThrow();
    });
  });
});
