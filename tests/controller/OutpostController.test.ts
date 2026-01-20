import { describe, it, expect, beforeEach } from 'vitest';
import { OutpostController } from '../../src/controller/OutpostController';
import { RoadController } from '../../src/controller/RoadController';
import { Make7HexesMap } from '../utils/GameStateGenerator';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { Edge } from '../../src/model/hex/Edge';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { ResourceType } from '../../src/model/map/ResourceType';
import { RoadConstruction } from '../../src/model/game/RoadConstruction';
import { CityLevel } from '../../src/model/city/CityLevel';
import { GameState } from '../../src/model/game/GameState';

describe('OutpostController', () => {
  let gameState: GameState;
  let map: ReturnType<GameState['getGameMap']>;
  let civId: ReturnType<GameState['getPlayerCivilizationId']>;
  let resources: PlayerResources;
  const center = new HexCoord(0, 0);
  // Vertex de la ville dans Map7HexesScenario : (center, N, NW)
  const cityVertex = Vertex.create(
    center,
    center.neighbor(HexDirection.N),
    center.neighbor(HexDirection.NW)
  );

  beforeEach(() => {
    // Utiliser la carte de Map7HexesScenario
    gameState = Make7HexesMap();
    map = gameState.getGameMap()!;
    civId = gameState.getPlayerCivilizationId();
    resources = gameState.getPlayerResources();
  });

  describe('canBuildOutpost - cas de refus', () => {
    it('devrait refuser si le vertex a déjà une ville', () => {
      // La ville existe déjà dans Make7HexesMap sur cityVertex
      // Construire une route pour que le vertex touche une route
      const hexN = center.neighbor(HexDirection.N);
      const edge = Edge.create(center, hexN); // Route qui touche le vertex de la ville
      
      // Ajouter les ressources pour la route
      const roadCost = RoadConstruction.getCost(1);
      for (const [resource, amount] of roadCost.entries()) {
        resources.addResource(resource, amount);
      }
      
      map!.addRoad(edge, civId);
      
      // Vérifier que la construction est refusée
      const canBuild = OutpostController.canBuildOutpost(cityVertex, civId, map!);
      expect(canBuild).toBe(false);
    });

    it('devrait refuser si le vertex ne touche pas de route de la civilisation', () => {
      // Créer un vertex valide qui ne touche pas de route
      // Utiliser un vertex autour de l'hex SE (qui n'a pas de route)
      const hexSE = center.neighbor(HexDirection.SE);
      const vertices = map!.getGrid().getVertices(hexSE);
      
      // Prendre le premier vertex qui n'a pas de ville
      let vertex: Vertex | undefined;
      for (const v of vertices) {
        if (!map!.hasCity(v)) {
          vertex = v;
          break;
        }
      }
      
      // Il devrait y avoir au moins un vertex
      expect(vertex).toBeDefined();
      
      if (vertex) {
        // Vérifier que la construction est refusée
        const canBuild = OutpostController.canBuildOutpost(vertex, civId, map!);
        expect(canBuild).toBe(false);
      }
    });

    it('devrait refuser si le vertex est à distance < 2 d\'une ville', () => {
      // Construire une route depuis la ville (distance 1)
      // La route doit toucher le vertex de la ville
      const hexN = center.neighbor(HexDirection.N);
      const road1Edge = Edge.create(center, hexN); // Route qui touche le vertex de la ville
      
      // Ajouter les ressources pour la route
      const roadCost = RoadConstruction.getCost(1);
      for (const [resource, amount] of roadCost.entries()) {
        resources.addResource(resource, amount);
      }
      
      map!.addRoad(road1Edge, civId);
      
      // Obtenir les vertices qui touchent cette route
      const verticesForRoad1 = map!.getVerticesForEdge(road1Edge);
      
      // Trouver un vertex qui n'est pas la ville elle-même
      let vertexAtDistance1: Vertex | undefined;
      for (const vertex of verticesForRoad1) {
        if (!map!.hasCity(vertex)) {
          vertexAtDistance1 = vertex;
          break;
        }
      }
      
      // Il devrait y avoir au moins un vertex (la ville elle-même)
      // Vérifier que la construction est refusée (distance < 2)
      if (vertexAtDistance1) {
        const canBuild = OutpostController.canBuildOutpost(vertexAtDistance1, civId, map!);
        expect(canBuild).toBe(false);
      } else {
        // Si aucun vertex n'est trouvé (tous sont la ville), c'est aussi correct
        // Vérifier qu'aucun vertex constructible n'existe à distance 1
        const buildableVertices = OutpostController.getBuildableVerticesAroundHex(hexN, civId, map!);
        expect(buildableVertices.length).toBe(0);
      }
    });

    it('devrait refuser si le vertex touche une route d\'une autre civilisation', () => {
      const otherCivId = CivilizationId.create('other-civ');
      map!.registerCivilization(otherCivId);
      
      // Créer une ville pour l'autre civilisation
      const hexSE = center.neighbor(HexDirection.SE);
      const otherCityVertex = Vertex.create(
        center,
        hexSE,
        center.neighbor(HexDirection.S)
      );
      map!.addCity(otherCityVertex, otherCivId, CityLevel.Colony);
      
      // Construire une route pour l'autre civilisation
      const edge = Edge.create(center, hexSE);
      map!.addRoad(edge, otherCivId);
      
      // Obtenir les vertices qui touchent cette route
      const verticesForEdge = map!.getVerticesForEdge(edge);
      
      // Trouver un vertex qui n'est pas la ville de l'autre civilisation
      let vertex: Vertex | undefined;
      for (const v of verticesForEdge) {
        if (!map!.hasCity(v) || !map!.getCity(v)?.owner.equals(otherCivId)) {
          vertex = v;
          break;
        }
      }
      
      // Il devrait y avoir au moins un vertex
      expect(vertex).toBeDefined();
      
      if (vertex) {
        // Vérifier que la construction est refusée (route d'une autre civilisation)
        const canBuild = OutpostController.canBuildOutpost(vertex, civId, map!);
        expect(canBuild).toBe(false);
      }
    });

    it('devrait accepter si toutes les conditions sont remplies', () => {
      // Construire des routes exactement comme dans Map7HexesScenario
      const hexN = center.neighbor(HexDirection.N);
      const hexNE = center.neighbor(HexDirection.NE);
      
      // Ajouter des ressources pour les routes
      resources.addResource(ResourceType.Brick, 10);
      resources.addResource(ResourceType.Wood, 10);
      
      // Route 1: center-N (touche le vertex de la ville)
      RoadController.buildRoad(
        Edge.create(center, hexN),
        civId,
        map!,
        resources
      );
      
      // Route 2: center-NE (touche aussi le vertex de la ville)
      RoadController.buildRoad(
        Edge.create(center, hexNE),
        civId,
        map!,
        resources
      );
      
      // Utiliser le même vertex que Map7HexesScenario : (center, SE, NE)
      const outpostVertex = Vertex.create(
        center,
        center.neighbor(HexDirection.SE),
        hexNE
      );
      
      // Vérifier que le vertex est constructible
      const canBuild = OutpostController.canBuildOutpost(outpostVertex, civId, map!);
      expect(canBuild).toBe(true);
      
      // Vérifier la distance du vertex (doit être >= 2)
      const vertexDistance = map!.calculateVertexDistanceToCity(outpostVertex, civId);
      expect(vertexDistance).toBeDefined();
      expect(vertexDistance!).toBeGreaterThanOrEqual(2);
    });
  });

  describe('buildOutpost - cas de refus', () => {
    it('devrait refuser la construction si les ressources sont insuffisantes', () => {
      // Construire des routes comme dans Map7HexesScenario
      const hexN = center.neighbor(HexDirection.N);
      const hexNE = center.neighbor(HexDirection.NE);
      
      // Route 1: center-N
      const road1Edge = Edge.create(center, hexN);
      const road1Cost = RoadConstruction.getCost(1);
      for (const [resource, amount] of road1Cost.entries()) {
        resources.addResource(resource, amount);
      }
      map!.addRoad(road1Edge, civId);
      
      // Route 2: center-NE
      const road2Edge = Edge.create(center, hexNE);
      const road2Cost = RoadConstruction.getCost(2);
      for (const [resource, amount] of road2Cost.entries()) {
        resources.addResource(resource, amount);
      }
      map!.addRoad(road2Edge, civId);
      
      // Route 3: N-NE (distance 2)
      const road3Edge = Edge.create(hexN, hexNE);
      const road3Cost = RoadConstruction.getCost(2);
      for (const [resource, amount] of road3Cost.entries()) {
        resources.addResource(resource, amount);
      }
      map!.addRoad(road3Edge, civId);
      
      // Obtenir tous les vertices constructibles
      const allBuildableVertices = map!.getBuildableOutpostVertices(civId);
      
      // Il devrait y avoir au moins un vertex constructible
      expect(allBuildableVertices.length).toBeGreaterThan(0);
      
      // Prendre le premier vertex constructible
      const vertex = allBuildableVertices[0];
      
      {
        // Vérifier d'abord que canBuildOutpost retourne true (conditions de distance OK)
        const canBuild = OutpostController.canBuildOutpost(vertex, civId, map!);
        expect(canBuild).toBe(true);
        
        // Ne pas ajouter de ressources pour l'avant-poste
        
        // Vérifier que la construction échoue avec le bon message d'erreur
        expect(() => {
          OutpostController.buildOutpost(vertex, civId, map!, resources);
        }).toThrow(/Pas assez de ressources/);
      }
    });

    it('devrait refuser la construction si le vertex a déjà une ville', () => {
      // La ville existe déjà sur cityVertex
      // Construire une route
      const hexN = center.neighbor(HexDirection.N);
      const edge = Edge.create(center, hexN);
      
      const roadCost = RoadConstruction.getCost(1);
      for (const [resource, amount] of roadCost.entries()) {
        resources.addResource(resource, amount);
      }
      
      map!.addRoad(edge, civId);
      
      // Ajouter des ressources pour l'avant-poste
      const cityCount = map!.getCityCount();
      const cost = OutpostController.getBuildableOutpostCost(cityCount);
      for (const [resource, amount] of cost.entries()) {
        resources.addResource(resource, amount);
      }
      
      // Vérifier que la construction échoue
      expect(() => {
        OutpostController.buildOutpost(cityVertex, civId, map!, resources);
      }).toThrow(/ne peut pas être construit/);
    });

    it('devrait refuser la construction si la distance est insuffisante', () => {
      // Construire une route à distance 1 seulement
      const hexN = center.neighbor(HexDirection.N);
      const road1Edge = Edge.create(center, hexN);
      
      const roadCost = RoadConstruction.getCost(1);
      for (const [resource, amount] of roadCost.entries()) {
        resources.addResource(resource, amount);
      }
      
      map!.addRoad(road1Edge, civId);
      
      // Obtenir les vertices qui touchent cette route
      const verticesForRoad1 = map!.getVerticesForEdge(road1Edge);
      
      // Trouver un vertex qui n'est pas la ville
      let vertex: Vertex | undefined;
      for (const v of verticesForRoad1) {
        if (!map!.hasCity(v)) {
          vertex = v;
          break;
        }
      }
      
      // Si un vertex est trouvé, il devrait être à distance 1
      if (vertex) {
        // Ajouter des ressources
        const cityCount = map!.getCityCount();
        const cost = OutpostController.getBuildableOutpostCost(cityCount);
        for (const [resource, amount] of cost.entries()) {
          resources.addResource(resource, amount);
        }
        
        // Vérifier que la construction échoue (distance < 2)
        expect(() => {
          OutpostController.buildOutpost(vertex, civId, map!, resources);
        }).toThrow(/ne peut pas être construit/);
      } else {
        // Si aucun vertex n'est trouvé, vérifier qu'aucun vertex constructible n'existe
        const buildableVertices = OutpostController.getBuildableVerticesAroundHex(hexN, civId, map!);
        expect(buildableVertices.length).toBe(0);
      }
    });
  });

  describe('getBuildableOutpostVertices après construction d\'un avant-poste', () => {
    it('devrait exclure les vertices trop proches après la construction d\'un nouvel avant-poste', () => {
      // Construire des routes comme dans Map7HexesScenario
      const hexN = center.neighbor(HexDirection.N);
      const hexNE = center.neighbor(HexDirection.NE);
      const hexSE = center.neighbor(HexDirection.SE);
      
      // Route 1: center-N (touche le vertex de la ville)
      const road1Edge = Edge.create(center, hexN);
      const road1Cost = RoadConstruction.getCost(1);
      for (const [resource, amount] of road1Cost.entries()) {
        resources.addResource(resource, amount);
      }
      map!.addRoad(road1Edge, civId);
      
      // Route 2: center-NE (touche aussi le vertex de la ville)
      const road2Edge = Edge.create(center, hexNE);
      const road2Cost = RoadConstruction.getCost(2);
      for (const [resource, amount] of road2Cost.entries()) {
        resources.addResource(resource, amount);
      }
      map!.addRoad(road2Edge, civId);
      
      // Route 3: N-NE (distance 2)
      const road3Edge = Edge.create(hexN, hexNE);
      const road3Cost = RoadConstruction.getCost(2);
      for (const [resource, amount] of road3Cost.entries()) {
        resources.addResource(resource, amount);
      }
      map!.addRoad(road3Edge, civId);
      
      // Route 4: NE-SE (distance 3, pour avoir un vertex à distance 1 de l'avant-poste)
      const road4Edge = Edge.create(hexNE, hexSE);
      const road4Cost = RoadConstruction.getCost(3);
      for (const [resource, amount] of road4Cost.entries()) {
        resources.addResource(resource, amount);
      }
      map!.addRoad(road4Edge, civId);
      
      // Obtenir tous les vertices constructibles
      const allBuildableVertices = map!.getBuildableOutpostVertices(civId);
      
      // Il devrait y avoir au moins un vertex constructible
      expect(allBuildableVertices.length).toBeGreaterThan(0);
      
      // Prendre le premier vertex constructible qui touche road3Edge (distance 2)
      let outpostVertex: Vertex | undefined;
      for (const v of allBuildableVertices) {
        const edgesForVertex = map!.getEdgesForVertex(v);
        if (edgesForVertex.some(e => e.equals(road3Edge))) {
          outpostVertex = v;
          break;
        }
      }
      
      // Si aucun ne touche road3Edge, prendre le premier disponible
      if (!outpostVertex && allBuildableVertices.length > 0) {
        outpostVertex = allBuildableVertices[0];
      }
      
      expect(outpostVertex).toBeDefined();
      
      {
        // Vérifier qu'il est constructible avant
        const canBuildBefore = OutpostController.canBuildOutpost(outpostVertex, civId, map!);
        expect(canBuildBefore).toBe(true);
        
        // Vérifier qu'il y a au moins ce vertex constructible
        const buildableBefore = map!.getBuildableOutpostVertices(civId);
        const outpostVertexInBuildable = buildableBefore.some(v => v.equals(outpostVertex));
        expect(outpostVertexInBuildable).toBe(true);
        
        // Ajouter assez de ressources pour construire l'avant-poste
        const cityCount = map!.getCityCount(); // Devrait être 1
        const outpostCost = OutpostController.getBuildableOutpostCost(cityCount);
        for (const [resource, amount] of outpostCost.entries()) {
          resources.addResource(resource, amount);
        }
        
        // Construire l'avant-poste
        OutpostController.buildOutpost(outpostVertex, civId, map!, resources);
        
        // Vérifier que l'avant-poste a été construit
        expect(map!.hasCity(outpostVertex)).toBe(true);
        
        // Après la construction, vérifier que les vertices trop proches sont exclus
        const buildableAfter = map!.getBuildableOutpostVertices(civId);
        
        // Vérifier que le vertex où on a construit l'avant-poste n'est plus constructible
        const stillBuildable = buildableAfter.some(v => v.equals(outpostVertex));
        expect(stillBuildable).toBe(false);
        
        // Vérifier que les vertices à distance < 2 du nouvel avant-poste ne sont plus constructibles
        for (const vertex of buildableAfter) {
          const distance = map!.calculateVertexDistanceToCity(vertex, civId);
          expect(distance).toBeDefined();
          expect(distance!).toBeGreaterThanOrEqual(2);
        }
        
        // Vérifier qu'un vertex qui était à distance 1 de l'avant-poste n'est plus constructible
        // Le vertex qui touche road3Edge (distance 3 de cityVertex, distance 1 de outpostVertex)
        const verticesForRoad3 = map!.getVerticesForEdge(road3Edge);
        
        for (const road3Vertex of verticesForRoad3) {
          const vertexHexes = road3Vertex.getHexes();
          const allHexesExist = vertexHexes.every(h => map!.getGrid().hasHex(h));
          if (!allHexesExist || map!.hasCity(road3Vertex)) {
            continue;
          }
          
          const road3VertexDistance = map!.calculateVertexDistanceToCity(road3Vertex, civId);
          // road3Vertex est à distance 1 de outpostVertex (via road3Edge), donc pas constructible
          if (road3VertexDistance === 1) {
            // Vérifier qu'il n'est plus dans la liste des constructibles
            const road3VertexInBuildable = buildableAfter.some(v => v.equals(road3Vertex));
            expect(road3VertexInBuildable).toBe(false);
          }
        }
      }
    });
  });
});
