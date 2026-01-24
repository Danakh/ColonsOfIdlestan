import { describe, it, expect } from 'vitest';
import { Edge } from '../../../src/model/hex/Edge';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { MainHexDirection } from '../../../src/model/hex/MainHexDirection';

describe('Edge', () => {
  describe('création et validation', () => {
    it('devrait créer une arête entre deux hexagones adjacents', () => {
      const hex1 = new HexCoord(0, 0);
      const hex2 = hex1.neighborMain(MainHexDirection.SW);
      
      const edge = Edge.create(hex1, hex2);
      
      expect(edge).toBeDefined();
      expect(edge.isAdjacentTo(hex1)).toBe(true);
      expect(edge.isAdjacentTo(hex2)).toBe(true);
    });

    it('devrait échouer si les hexagones ne sont pas adjacents', () => {
      const hex1 = new HexCoord(0, 0);
      const hex2 = new HexCoord(5, 5);
      
      expect(() => Edge.create(hex1, hex2)).toThrow();
    });

    it('devrait normaliser l\'ordre des hexagones pour garantir l\'unicité', () => {
      const hex1 = new HexCoord(0, 0);
      const hex2 = hex1.neighborMain(MainHexDirection.SE);
      
      const edge1 = Edge.create(hex1, hex2);
      const edge2 = Edge.create(hex2, hex1);
      
      expect(edge1.equals(edge2)).toBe(true);
      expect(edge1.hashCode()).toBe(edge2.hashCode());
    });
  });

  describe('égalité et hashage', () => {
    it('devrait considérer deux arêtes égales si elles connectent les mêmes hexagones', () => {
      const hex1 = new HexCoord(2, 3);
      const hex2 = hex1.neighborMain(MainHexDirection.NW);
      
      const edge1 = Edge.create(hex1, hex2);
      const edge2 = Edge.create(hex2, hex1);
      
      expect(edge1.equals(edge2)).toBe(true);
    });

    it('devrait générer le même hash code pour des arêtes égales', () => {
      const hex1 = new HexCoord(1, 1);
      const hex2 = hex1.neighborMain(MainHexDirection.E);
      
      const edge1 = Edge.create(hex1, hex2);
      const edge2 = Edge.create(hex2, hex1);
      
      expect(edge1.hashCode()).toBe(edge2.hashCode());
    });

    it('devrait générer des hash codes différents pour des arêtes différentes', () => {
      const center = new HexCoord(0, 0);
      const edge1 = Edge.create(center, center.neighborMain(MainHexDirection.SW));
      const edge2 = Edge.create(center, center.neighborMain(MainHexDirection.SE));
      
      expect(edge1.hashCode()).not.toBe(edge2.hashCode());
    });
  });

  describe('méthodes utilitaires', () => {
    it('devrait retourner les deux hexagones de l\'arête', () => {
      const hex1 = new HexCoord(3, 4);
      const hex2 = hex1.neighborMain(MainHexDirection.W);
      
      const edge = Edge.create(hex1, hex2);
      const [h1, h2] = edge.getHexes();
      
      expect(
        (h1.equals(hex1) && h2.equals(hex2)) ||
        (h1.equals(hex2) && h2.equals(hex1))
      ).toBe(true);
    });

    it('devrait vérifier correctement l\'adjacence à un hexagone', () => {
      const hex1 = new HexCoord(0, 0);
      const hex2 = hex1.neighborMain(MainHexDirection.NE);
      const hex3 = hex1.neighborMain(MainHexDirection.SW);
      
      const edge = Edge.create(hex1, hex2);
      
      expect(edge.isAdjacentTo(hex1)).toBe(true);
      expect(edge.isAdjacentTo(hex2)).toBe(true);
      expect(edge.isAdjacentTo(hex3)).toBe(false);
    });
  });
});
