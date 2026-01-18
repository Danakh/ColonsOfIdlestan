import { describe, it, expect, beforeEach } from 'vitest';
import { OutpostController } from '../../src/controller/OutpostController';
import { GameMap } from '../../src/model/map/GameMap';
import { HexGrid } from '../../src/model/hex/HexGrid';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { Vertex } from '../../src/model/hex/Vertex';
import { Edge } from '../../src/model/hex/Edge';
import { Hex } from '../../src/model/hex/Hex';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { ResourceType } from '../../src/model/map/ResourceType';
import { RoadConstruction } from '../../src/model/game/RoadConstruction';
import { CityLevel } from '../../src/model/city/CityLevel';

describe('OutpostController', () => {
  let map: GameMap;
  let civId: CivilizationId;
  let resources: PlayerResources;

  beforeEach(() => {
    // Créer une grille hexagonale avec des hexagones
    const grid = new HexGrid([
      new Hex(new HexCoord(0, 0)),
      new Hex(new HexCoord(1, 0)),
      new Hex(new HexCoord(0, 1)),
      new Hex(new HexCoord(1, 1)),
      new Hex(new HexCoord(2, 0)),
      new Hex(new HexCoord(2, 1)),
      new Hex(new HexCoord(3, 0)),
      new Hex(new HexCoord(3, 1)),
      new Hex(new HexCoord(4, 0)),
      new Hex(new HexCoord(4, 1)),
    ]);
    
    map = new GameMap(grid);
    civId = new CivilizationId('test-civ');
    map.registerCivilization(civId);
    resources = new PlayerResources();
  });

  describe('canBuildOutpost - cas de refus', () => {
    it('devrait refuser si le vertex a déjà une ville', () => {
      const vertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      
      // Créer une ville sur ce vertex
      map.addCity(vertex, civId, CityLevel.Colony);
      
      // Construire une route pour que le vertex touche une route
      const edge = Edge.create(new HexCoord(0, 0), new HexCoord(1, 0));
      map.addRoad(edge, civId);
      
      // Vérifier que la construction est refusée
      const canBuild = OutpostController.canBuildOutpost(vertex, civId, map);
      expect(canBuild).toBe(false);
    });

    it('devrait refuser si le vertex ne touche pas de route de la civilisation', () => {
      const vertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      
      // Ne pas construire de route
      
      // Vérifier que la construction est refusée
      const canBuild = OutpostController.canBuildOutpost(vertex, civId, map);
      expect(canBuild).toBe(false);
    });

    it('devrait refuser si le vertex est à distance < 2 d\'une ville', () => {
      // Créer une ville
      const cityVertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      map.addCity(cityVertex, civId, CityLevel.Colony);
      
      // Construire une route depuis la ville (distance 1)
      const road1Edge = Edge.create(new HexCoord(1, 0), new HexCoord(2, 0));
      map.addRoad(road1Edge, civId);
      
      // Vertex qui touche la route (distance 1 de la ville)
      const vertexAtDistance1 = Vertex.create(
        new HexCoord(1, 0),
        new HexCoord(2, 0),
        new HexCoord(1, 1)
      );
      
      // Vérifier que la construction est refusée (distance < 2)
      const canBuild = OutpostController.canBuildOutpost(vertexAtDistance1, civId, map);
      expect(canBuild).toBe(false);
    });

    it('devrait refuser si le vertex touche une route d\'une autre civilisation', () => {
      const otherCivId = new CivilizationId('other-civ');
      map.registerCivilization(otherCivId);
      
      // Créer une ville pour l'autre civilisation
      const cityVertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      map.addCity(cityVertex, otherCivId, CityLevel.Colony);
      
      // Construire une route pour l'autre civilisation
      const edge = Edge.create(new HexCoord(1, 0), new HexCoord(2, 0));
      map.addRoad(edge, otherCivId);
      
      // Vertex qui touche la route de l'autre civilisation
      const vertex = Vertex.create(
        new HexCoord(1, 0),
        new HexCoord(2, 0),
        new HexCoord(1, 1)
      );
      
      // Vérifier que la construction est refusée (route d'une autre civilisation)
      const canBuild = OutpostController.canBuildOutpost(vertex, civId, map);
      expect(canBuild).toBe(false);
    });

    it('devrait accepter si toutes les conditions sont remplies', () => {
      // Créer une ville
      const cityVertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      map.addCity(cityVertex, civId, CityLevel.Colony);
      
      // Construire une première route depuis la ville (distance 1)
      const road1Edge = Edge.create(new HexCoord(1, 0), new HexCoord(2, 0));
      map.addRoad(road1Edge, civId);
      
      // Construire une deuxième route (distance 2)
      const road2Edge = Edge.create(new HexCoord(2, 0), new HexCoord(3, 0));
      map.addRoad(road2Edge, civId);
      
      // Vertex qui touche la route à distance 2 (doit toucher road2Edge)
      // Le vertex doit contenir les deux hexes de road2Edge
      const vertexAtDistance2 = Vertex.create(
        new HexCoord(2, 0),
        new HexCoord(3, 0),
        new HexCoord(2, 1)
      );
      
      // Vérifier que le vertex touche bien la route
      const edgesForVertex = map.getEdgesForVertex(vertexAtDistance2);
      const touchesRoad2 = edgesForVertex.some(e => e.equals(road2Edge));
      expect(touchesRoad2).toBe(true);
      
      // Vérifier que la construction est acceptée
      const canBuild = OutpostController.canBuildOutpost(vertexAtDistance2, civId, map);
      expect(canBuild).toBe(true);
    });
  });

  describe('buildOutpost - cas de refus', () => {
    it('devrait refuser la construction si les ressources sont insuffisantes', () => {
      // Créer une ville
      const cityVertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      map.addCity(cityVertex, civId, CityLevel.Colony);
      
      // Construire une route à distance 2
      const road1Edge = Edge.create(new HexCoord(1, 0), new HexCoord(2, 0));
      map.addRoad(road1Edge, civId);
      const road2Edge = Edge.create(new HexCoord(2, 0), new HexCoord(3, 0));
      map.addRoad(road2Edge, civId);
      
      const vertex = Vertex.create(
        new HexCoord(2, 0),
        new HexCoord(3, 0),
        new HexCoord(2, 1)
      );
      
      // Vérifier d'abord que canBuildOutpost retourne true (conditions de distance OK)
      const canBuild = OutpostController.canBuildOutpost(vertex, civId, map);
      expect(canBuild).toBe(true);
      
      // Ne pas ajouter de ressources
      
      // Vérifier que la construction échoue avec le bon message d'erreur
      expect(() => {
        OutpostController.buildOutpost(vertex, civId, map, resources);
      }).toThrow(/Pas assez de ressources/);
    });

    it('devrait refuser la construction si le vertex a déjà une ville', () => {
      const vertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      
      // Créer une ville sur ce vertex
      map.addCity(vertex, civId, CityLevel.Colony);
      
      // Construire une route
      const edge = Edge.create(new HexCoord(0, 0), new HexCoord(1, 0));
      map.addRoad(edge, civId);
      
      // Ajouter des ressources
      const cityCount = map.getCityCount();
      const cost = OutpostController.getBuildableOutpostCost(cityCount);
      for (const [resource, amount] of cost.entries()) {
        resources.addResource(resource, amount);
      }
      
      // Vérifier que la construction échoue
      expect(() => {
        OutpostController.buildOutpost(vertex, civId, map, resources);
      }).toThrow(/ne peut pas être construit/);
    });

    it('devrait refuser la construction si la distance est insuffisante', () => {
      // Créer une ville
      const cityVertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      map.addCity(cityVertex, civId, CityLevel.Colony);
      
      // Construire une route à distance 1 seulement
      const road1Edge = Edge.create(new HexCoord(1, 0), new HexCoord(2, 0));
      map.addRoad(road1Edge, civId);
      
      const vertex = Vertex.create(
        new HexCoord(1, 0),
        new HexCoord(2, 0),
        new HexCoord(1, 1)
      );
      
      // Ajouter des ressources
      const cityCount = map.getCityCount();
      const cost = OutpostController.getBuildableOutpostCost(cityCount);
      for (const [resource, amount] of cost.entries()) {
        resources.addResource(resource, amount);
      }
      
      // Vérifier que la construction échoue
      expect(() => {
        OutpostController.buildOutpost(vertex, civId, map, resources);
      }).toThrow(/ne peut pas être construit/);
    });
  });

  describe('getBuildableOutpostVertices après construction d\'un avant-poste', () => {
    it('devrait exclure les vertices trop proches après la construction d\'un nouvel avant-poste', () => {
      // Créer une ville initiale
      const cityVertex = Vertex.create(
        new HexCoord(0, 0),
        new HexCoord(1, 0),
        new HexCoord(0, 1)
      );
      map.addCity(cityVertex, civId, CityLevel.Colony);
      
      // Construire une première route depuis la ville (distance 1)
      const road1Edge = Edge.create(new HexCoord(1, 0), new HexCoord(2, 0));
      
      // Ajouter assez de ressources pour la route
      const roadCost = RoadConstruction.getCost(1);
      for (const [resource, amount] of roadCost.entries()) {
        resources.addResource(resource, amount);
      }
      
      map.addRoad(road1Edge, civId);
      
      // Construire une deuxième route (distance 2 depuis la ville)
      const road2Edge = Edge.create(new HexCoord(2, 0), new HexCoord(3, 0));
      
      const road2Cost = RoadConstruction.getCost(2);
      for (const [resource, amount] of road2Cost.entries()) {
        resources.addResource(resource, amount);
      }
      
      map.addRoad(road2Edge, civId);
      
      // Construire une troisième route (distance 3 depuis la ville)
      const road3Edge = Edge.create(new HexCoord(3, 0), new HexCoord(4, 0));
      
      const road3Cost = RoadConstruction.getCost(3);
      for (const [resource, amount] of road3Cost.entries()) {
        resources.addResource(resource, amount);
      }
      
      map.addRoad(road3Edge, civId);
      
      // Trouver un vertex constructible à distance 2 de la ville initiale
      // (celui qui touche road2Edge, à distance 2)
      // Le vertex doit contenir les deux hexes de road2Edge
      const outpostVertex = Vertex.create(
        new HexCoord(2, 0),
        new HexCoord(3, 0),
        new HexCoord(2, 1)
      );
      
      // Vérifier qu'il est constructible avant
      const canBuildBefore = OutpostController.canBuildOutpost(outpostVertex, civId, map);
      expect(canBuildBefore).toBe(true);
      
      // Vérifier qu'il y a au moins ce vertex constructible
      const buildableBefore = map.getBuildableOutpostVertices(civId);
      const outpostVertexInBuildable = buildableBefore.some(v => v.equals(outpostVertex));
      expect(outpostVertexInBuildable).toBe(true);
      
      // Ajouter assez de ressources pour construire l'avant-poste
      const cityCount = map.getCityCount(); // Devrait être 1
      const outpostCost = OutpostController.getBuildableOutpostCost(cityCount);
      for (const [resource, amount] of outpostCost.entries()) {
        resources.addResource(resource, amount);
      }
      
      // Construire l'avant-poste
      OutpostController.buildOutpost(outpostVertex, civId, map, resources);
      
      // Vérifier que l'avant-poste a été construit
      expect(map.hasCity(outpostVertex)).toBe(true);
      
      // Après la construction, vérifier que les vertices trop proches sont exclus
      const buildableAfter = map.getBuildableOutpostVertices(civId);
      
      // Vérifier que le vertex où on a construit l'avant-poste n'est plus constructible
      const stillBuildable = buildableAfter.some(v => v.equals(outpostVertex));
      expect(stillBuildable).toBe(false);
      
      // Vérifier que les vertices à distance < 2 du nouvel avant-poste ne sont plus constructibles
      for (const vertex of buildableAfter) {
        const distance = map.calculateVertexDistanceToCity(vertex, civId);
        expect(distance).toBeDefined();
        expect(distance!).toBeGreaterThanOrEqual(2);
      }
      
      // Vérifier qu'un vertex qui était à distance 1 de l'avant-poste n'est plus constructible
      // Le vertex qui touche road3Edge (distance 3 de cityVertex, distance 1 de outpostVertex)
      const road3Vertex = Vertex.create(
        new HexCoord(3, 0),
        new HexCoord(4, 0),
        new HexCoord(3, 1)
      );
      const road3VertexDistance = map.calculateVertexDistanceToCity(road3Vertex, civId);
      // road3Vertex est à distance 1 de outpostVertex (via road3Edge), donc pas constructible
      expect(road3VertexDistance).toBe(1); // Distance minimale à outpostVertex (qui est maintenant une ville)
      
      // Vérifier qu'il n'est plus dans la liste des constructibles
      const road3VertexInBuildable = buildableAfter.some(v => v.equals(road3Vertex));
      expect(road3VertexInBuildable).toBe(false);
    });
  });
});
