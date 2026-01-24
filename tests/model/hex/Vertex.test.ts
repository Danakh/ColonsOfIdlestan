import { describe, it, expect } from 'vitest';
import { Vertex } from '../../../src/model/hex/Vertex';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { MainHexDirection } from '../../../src/model/hex/MainHexDirection';

describe('Vertex', () => {
  describe('création et validation', () => {
    it('devrait créer un sommet avec trois hexagones mutuellement adjacents', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);
      
      // Vérifier que les trois sont mutuellement adjacents
      expect(center.distanceTo(north)).toBe(1);
      expect(center.distanceTo(northeast)).toBe(1);
      expect(north.distanceTo(northeast)).toBe(1);
      
      const vertex = Vertex.create(center, north, northeast);
      
      expect(vertex).toBeDefined();
      expect(vertex.isAdjacentTo(center)).toBe(true);
      expect(vertex.isAdjacentTo(north)).toBe(true);
      expect(vertex.isAdjacentTo(northeast)).toBe(true);
    });

    it('devrait échouer si les hexagones ne forment pas un triangle valide', () => {
      const hex1 = new HexCoord(0, 0);
      const hex2 = new HexCoord(5, 5);
      const hex3 = new HexCoord(10, 10);
      
      expect(() => Vertex.create(hex1, hex2, hex3)).toThrow();
    });

    it('devrait normaliser l\'ordre des hexagones pour garantir l\'unicité', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);
      
      const vertex1 = Vertex.create(center, north, northeast);
      const vertex2 = Vertex.create(northeast, center, north);
      const vertex3 = Vertex.create(north, northeast, center);
      
      expect(vertex1.equals(vertex2)).toBe(true);
      expect(vertex1.equals(vertex3)).toBe(true);
      expect(vertex2.equals(vertex3)).toBe(true);
    });
  });

  describe('égalité et hashage', () => {
    it('devrait considérer deux sommets égaux s\'ils contiennent les mêmes hexagones', () => {
      const center = new HexCoord(2, 3);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);
      
      const vertex1 = Vertex.create(center, north, northeast);
      const vertex2 = Vertex.create(northeast, north, center);
      
      expect(vertex1.equals(vertex2)).toBe(true);
    });

    it('devrait générer le même hash code pour des sommets égaux', () => {
      const center = new HexCoord(1, 1);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);
      
      const vertex1 = Vertex.create(center, north, northeast);
      const vertex2 = Vertex.create(northeast, center, north);
      
      expect(vertex1.hashCode()).toBe(vertex2.hashCode());
    });

    it('devrait générer des hash codes différents pour des sommets différents', () => {
      const center = new HexCoord(0, 0);
      const vertex1 = Vertex.create(
        center,
        center.neighborMain(MainHexDirection.SW),
        center.neighborMain(MainHexDirection.SE)
      );
      const vertex2 = Vertex.create(
        center,
        center.neighborMain(MainHexDirection.SE),
        center.neighborMain(MainHexDirection.E)
      );
      
      expect(vertex1.hashCode()).not.toBe(vertex2.hashCode());
    });
  });

  describe('méthodes utilitaires', () => {
    it('devrait retourner les trois hexagones du sommet', () => {
      const center = new HexCoord(3, 4);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);
      
      const vertex = Vertex.create(center, north, northeast);
      const hexes = vertex.getHexes();
      
      expect(hexes).toHaveLength(3);
      expect(
        hexes.some(h => h.equals(center)) &&
        hexes.some(h => h.equals(north)) &&
        hexes.some(h => h.equals(northeast))
      ).toBe(true);
    });

    it('devrait vérifier correctement l\'adjacence à un hexagone', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      const northeast = center.neighborMain(MainHexDirection.SE);
      const south = center.neighborMain(MainHexDirection.NE);
      
      const vertex = Vertex.create(center, north, northeast);
      
      expect(vertex.isAdjacentTo(center)).toBe(true);
      expect(vertex.isAdjacentTo(north)).toBe(true);
      expect(vertex.isAdjacentTo(northeast)).toBe(true);
      expect(vertex.isAdjacentTo(south)).toBe(false);
    });
  });
});
