import { describe, it, expect } from 'vitest';
import { HexGrid } from '../../../src/model/hex/HexGrid';
import { Hex } from '../../../src/model/hex/Hex';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection } from '../../../src/model/hex/HexDirection';

describe('HexGrid', () => {
  describe('lookup d\'hexagones', () => {
    it('devrait retourner un hexagone par coordonnée', () => {
      const hex = new Hex(new HexCoord(0, 0));
      const grid = new HexGrid([hex]);
      
      const found = grid.getHex(new HexCoord(0, 0));
      expect(found).toBeDefined();
      expect(found?.coord.equals(hex.coord)).toBe(true);
    });

    it('devrait retourner undefined pour une coordonnée inexistante', () => {
      const hex = new Hex(new HexCoord(0, 0));
      const grid = new HexGrid([hex]);
      
      const found = grid.getHex(new HexCoord(10, 10));
      expect(found).toBeUndefined();
    });

    it('devrait retourner tous les hexagones', () => {
      const hexes = [
        new Hex(new HexCoord(0, 0)),
        new Hex(new HexCoord(1, 0)),
        new Hex(new HexCoord(0, 1)),
      ];
      const grid = new HexGrid(hexes);
      
      const allHexes = grid.getAllHexes();
      expect(allHexes).toHaveLength(3);
    });

    it('devrait vérifier l\'existence d\'un hexagone', () => {
      const hex = new Hex(new HexCoord(2, 3));
      const grid = new HexGrid([hex]);
      
      expect(grid.hasHex(new HexCoord(2, 3))).toBe(true);
      expect(grid.hasHex(new HexCoord(5, 5))).toBe(false);
    });

    it('devrait retourner la taille correcte de la grille', () => {
      const hexes = [
        new Hex(new HexCoord(0, 0)),
        new Hex(new HexCoord(1, 0)),
      ];
      const grid = new HexGrid(hexes);
      
      expect(grid.size()).toBe(2);
    });
  });

  describe('recherche de voisins', () => {
    it('devrait retourner les hexagones voisins existants', () => {
      const center = new Hex(new HexCoord(0, 0));
      const north = new Hex(new HexCoord(0, -1));
      const northeast = new Hex(new HexCoord(1, -1));
      
      const grid = new HexGrid([center, north, northeast]);
      
      const neighbors = grid.getNeighbors(new HexCoord(0, 0));
      expect(neighbors).toHaveLength(2);
      
      const neighborCoords = neighbors.map(n => n.coord.hashCode());
      expect(neighborCoords).toContain(north.coord.hashCode());
      expect(neighborCoords).toContain(northeast.coord.hashCode());
    });

    it('devrait retourner une liste vide si aucun voisin n\'existe', () => {
      const isolated = new Hex(new HexCoord(10, 10));
      const grid = new HexGrid([isolated]);
      
      const neighbors = grid.getNeighbors(new HexCoord(10, 10));
      expect(neighbors).toHaveLength(0);
    });

    it('devrait retourner tous les 6 voisins quand ils existent tous', () => {
      const center = new HexCoord(0, 0);
      const hexes = [
        new Hex(center),
        new Hex(center.neighbor(HexDirection.N)),
        new Hex(center.neighbor(HexDirection.NE)),
        new Hex(center.neighbor(HexDirection.SE)),
        new Hex(center.neighbor(HexDirection.S)),
        new Hex(center.neighbor(HexDirection.SW)),
        new Hex(center.neighbor(HexDirection.NW)),
      ];
      
      const grid = new HexGrid(hexes);
      const neighbors = grid.getNeighbors(center);
      
      expect(neighbors).toHaveLength(6);
    });

    it('devrait retourner les coordonnées des voisins même s\'ils n\'existent pas', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      
      const neighborCoords = grid.getNeighborCoords(center);
      expect(neighborCoords).toHaveLength(6);
    });
  });

  describe('gestion des arêtes', () => {
    it('devrait retourner les arêtes adjacentes à un hexagone', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      
      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      
      const edges = grid.getEdges(center);
      expect(edges.length).toBeGreaterThanOrEqual(2);
      
      // Vérifier que les arêtes connectent bien le centre à ses voisins
      const edgeHexes = edges.flatMap(e => e.getHexes().map(h => h.hashCode()));
      expect(edgeHexes).toContain(center.hashCode());
      expect(edgeHexes).toContain(north.hashCode());
      expect(edgeHexes).toContain(northeast.hashCode());
    });

    it('devrait retourner toutes les arêtes de la grille', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      
      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      
      const allEdges = grid.getAllEdges();
      expect(allEdges.length).toBeGreaterThan(0);
    });

    it('devrait partager les arêtes entre hexagones adjacents', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      
      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
      ]);
      
      const edgesFromCenter = grid.getEdges(center);
      const edgesFromNorth = grid.getEdges(north);
      
      // Trouver l'arête commune
      const centerEdgeHashes = new Set(
        edgesFromCenter.map(e => e.hashCode())
      );
      const northEdgeHashes = new Set(
        edgesFromNorth.map(e => e.hashCode())
      );
      
      // Il doit y avoir exactement une arête partagée
      const sharedEdges = [...centerEdgeHashes].filter(h =>
        northEdgeHashes.has(h)
      );
      expect(sharedEdges.length).toBe(1);
    });

    it('ne devrait pas créer de doublons d\'arêtes', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      
      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      
      const allEdges = grid.getAllEdges();
      const edgeHashes = allEdges.map(e => e.hashCode());
      const uniqueHashes = new Set(edgeHashes);
      
      expect(uniqueHashes.size).toBe(edgeHashes.length);
    });
  });

  describe('gestion des sommets', () => {
    it('devrait retourner les sommets adjacents à un hexagone', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      
      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      
      const vertices = grid.getVertices(center);
      expect(vertices.length).toBeGreaterThan(0);
      
      // Vérifier que les sommets contiennent le centre
      vertices.forEach(vertex => {
        expect(vertex.isAdjacentTo(center)).toBe(true);
      });
    });

    it('devrait retourner tous les sommets de la grille', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      
      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      
      const allVertices = grid.getAllVertices();
      expect(allVertices.length).toBeGreaterThan(0);
    });

    it('devrait partager les sommets entre hexagones adjacents', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      
      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      
      const verticesFromCenter = grid.getVertices(center);
      const verticesFromNorth = grid.getVertices(north);
      const verticesFromNortheast = grid.getVertices(northeast);
      
      // Trouver les sommets partagés
      const centerVertexHashes = new Set(
        verticesFromCenter.map(v => v.hashCode())
      );
      const northVertexHashes = new Set(
        verticesFromNorth.map(v => v.hashCode())
      );
      const northeastVertexHashes = new Set(
        verticesFromNortheast.map(v => v.hashCode())
      );
      
      // Il doit y avoir au moins un sommet partagé entre les trois
      const sharedBetweenCenterAndNorth = [...centerVertexHashes].filter(h =>
        northVertexHashes.has(h)
      );
      const sharedBetweenAll = [...centerVertexHashes].filter(
        h => northVertexHashes.has(h) && northeastVertexHashes.has(h)
      );
      
      expect(sharedBetweenCenterAndNorth.length).toBeGreaterThan(0);
      expect(sharedBetweenAll.length).toBeGreaterThan(0);
    });

    it('ne devrait pas créer de doublons de sommets', () => {
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
      
      const allVertices = grid.getAllVertices();
      const vertexHashes = allVertices.map(v => v.hashCode());
      const uniqueHashes = new Set(vertexHashes);
      
      expect(uniqueHashes.size).toBe(vertexHashes.length);
    });

    it('devrait créer exactement 6 sommets pour un hexagone isolé', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      
      const vertices = grid.getVerticesForHex(center);
      expect(vertices).toHaveLength(6);
    });
  });

  describe('intégration complète', () => {
    it('devrait gérer correctement une grille de 7 hexagones (centre + 6 voisins)', () => {
      const center = new HexCoord(0, 0);
      const hexes = [
        new Hex(center),
        new Hex(center.neighbor(HexDirection.N)),
        new Hex(center.neighbor(HexDirection.NE)),
        new Hex(center.neighbor(HexDirection.SE)),
        new Hex(center.neighbor(HexDirection.S)),
        new Hex(center.neighbor(HexDirection.SW)),
        new Hex(center.neighbor(HexDirection.NW)),
      ];
      
      const grid = new HexGrid(hexes);
      
      // Vérifier la taille
      expect(grid.size()).toBe(7);
      
      // Vérifier les voisins du centre
      const neighbors = grid.getNeighbors(center);
      expect(neighbors).toHaveLength(6);
      
      // Vérifier les arêtes
      const edges = grid.getAllEdges();
      expect(edges.length).toBeGreaterThan(0);
      
      // Vérifier les sommets
      const vertices = grid.getAllVertices();
      expect(vertices.length).toBeGreaterThan(0);
      
      // Vérifier qu'il n'y a pas de doublons
      const edgeHashes = new Set(edges.map(e => e.hashCode()));
      const vertexHashes = new Set(vertices.map(v => v.hashCode()));
      
      expect(edgeHashes.size).toBe(edges.length);
      expect(vertexHashes.size).toBe(vertices.length);
    });
  });
});
