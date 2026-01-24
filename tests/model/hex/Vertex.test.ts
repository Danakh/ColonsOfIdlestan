import { describe, it, expect } from 'vitest';
import { Vertex } from '../../../src/model/hex/Vertex';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection } from '../../../src/model/hex/HexDirection';
import { SecondaryHexDirection } from '../../../src/model/hex/SecondaryHexDirection';

describe('Vertex', () => {
  describe('création et validation', () => {
    it('devrait créer un sommet avec trois hexagones mutuellement adjacents', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      
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
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      
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
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      
      const vertex1 = Vertex.create(center, north, northeast);
      const vertex2 = Vertex.create(northeast, north, center);
      
      expect(vertex1.equals(vertex2)).toBe(true);
    });

    it('devrait générer le même hash code pour des sommets égaux', () => {
      const center = new HexCoord(1, 1);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      
      const vertex1 = Vertex.create(center, north, northeast);
      const vertex2 = Vertex.create(northeast, center, north);
      
      expect(vertex1.hashCode()).toBe(vertex2.hashCode());
    });

    it('devrait générer des hash codes différents pour des sommets différents', () => {
      const center = new HexCoord(0, 0);
      const vertex1 = Vertex.create(
        center,
        center.neighbor(HexDirection.SW),
        center.neighbor(HexDirection.SE)
      );
      const vertex2 = Vertex.create(
        center,
        center.neighbor(HexDirection.SE),
        center.neighbor(HexDirection.E)
      );
      
      expect(vertex1.hashCode()).not.toBe(vertex2.hashCode());
    });
  });

  describe('méthodes utilitaires', () => {
    it('devrait retourner les trois hexagones du sommet', () => {
      const center = new HexCoord(3, 4);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      
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
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      const south = center.neighbor(HexDirection.NE);
      
      const vertex = Vertex.create(center, north, northeast);
      
      expect(vertex.isAdjacentTo(center)).toBe(true);
      expect(vertex.isAdjacentTo(north)).toBe(true);
      expect(vertex.isAdjacentTo(northeast)).toBe(true);
      expect(vertex.isAdjacentTo(south)).toBe(false);
    });

    it('devrait retourner l\'hexagone qui a ce vertex dans sa direction opposée', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      
      const vertex = Vertex.create(center, north, northeast);
      
      // Le vertex est au nord (N) du center
      // Donc vertex.hex(N) devrait retourner center
      const hexInNorthDir = vertex.hex(SecondaryHexDirection.N);
      expect(hexInNorthDir).not.toBeNull();
      expect(hexInNorthDir?.equals(center)).toBe(true);
    });

    it('devrait retourner l\'hexagone qui a ce vertex dans la direction spécifiée', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.SW);
      const northeast = center.neighbor(HexDirection.SE);
      
      const vertex = Vertex.create(center, north, northeast);
      
      // Chercher l'hexagone dans la direction N depuis le vertex
      const hexInNorthDir = vertex.hex(SecondaryHexDirection.N);
      
      // Le hex retourné devrait être l'un des 3 hexs du vertex
      expect(hexInNorthDir).not.toBeNull();
      expect(vertex.isAdjacentTo(hexInNorthDir!)).toBe(true);
    });
  });
});
