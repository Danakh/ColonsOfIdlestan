import { describe, it, expect } from 'vitest';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { MainHexDirection, ALL_MAIN_DIRECTIONS } from '../../../src/model/hex/MainHexDirection';

describe('HexCoord', () => {
  describe('neighbor lookup', () => {
    it('devrait retourner le voisin Nord', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighborMain(MainHexDirection.SW);
      
      expect(north.q).toBe(0);
      expect(north.r).toBe(-1);
    });

    it('devrait retourner le voisin Nord-Est', () => {
      const center = new HexCoord(0, 0);
      const northeast = center.neighborMain(MainHexDirection.SE);
      
      expect(northeast.q).toBe(1);
      expect(northeast.r).toBe(-1);
    });

    it('devrait retourner le voisin Sud-Est', () => {
      const center = new HexCoord(0, 0);
      const southeast = center.neighborMain(MainHexDirection.E);
      
      expect(southeast.q).toBe(1);
      expect(southeast.r).toBe(0);
    });

    it('devrait retourner le voisin Sud', () => {
      const center = new HexCoord(0, 0);
      const south = center.neighborMain(MainHexDirection.NE);
      
      expect(south.q).toBe(0);
      expect(south.r).toBe(1);
    });

    it('devrait retourner le voisin Sud-Ouest', () => {
      const center = new HexCoord(0, 0);
      const southwest = center.neighborMain(MainHexDirection.NW);
      
      expect(southwest.q).toBe(-1);
      expect(southwest.r).toBe(1);
    });

    it('devrait retourner le voisin Nord-Ouest', () => {
      const center = new HexCoord(0, 0);
      const northwest = center.neighborMain(MainHexDirection.W);
      
      expect(northwest.q).toBe(-1);
      expect(northwest.r).toBe(0);
    });

    it('devrait retourner tous les 6 voisins', () => {
      const center = new HexCoord(0, 0);
      const neighbors = center.neighborsMain();
      
      expect(neighbors).toHaveLength(6);
      
      // Vérifier que tous les voisins sont différents
      const neighborHashes = new Set(neighbors.map(n => n.hashCode()));
      expect(neighborHashes.size).toBe(6);
    });

    it('devrait avoir une relation bidirectionnelle avec les voisins', () => {
      const center = new HexCoord(2, 3);
      
      // Pour chaque direction, vérifier que le voisin a le centre comme voisin dans la direction opposée
      const oppositeDirections: Record<MainHexDirection, MainHexDirection> = {
        [MainHexDirection.W]: MainHexDirection.E,
        [MainHexDirection.NW]: MainHexDirection.SE,
        [MainHexDirection.SW]: MainHexDirection.NE,
        [MainHexDirection.E]: MainHexDirection.W,
        [MainHexDirection.SE]: MainHexDirection.NW,
        [MainHexDirection.NE]: MainHexDirection.SW,
      };

      for (const [dir, oppositeDir] of Object.entries(oppositeDirections) as [
        MainHexDirection,
        MainHexDirection
      ][]) {
        const neighbor = center.neighborMain(dir);
        const backToCenter = neighbor.neighborMain(oppositeDir);
        
        expect(backToCenter.equals(center)).toBe(true);
      }
    });

    it('devrait calculer correctement la distance entre hexagones', () => {
      const center = new HexCoord(0, 0);
      const neighbor = center.neighborMain(MainHexDirection.SE);
      
      expect(center.distanceTo(neighbor)).toBe(1);
      expect(neighbor.distanceTo(center)).toBe(1);
    });

    it('devrait calculer correctement la distance pour des hexagones non adjacents', () => {
      const hex1 = new HexCoord(0, 0);
      const hex2 = new HexCoord(2, 1);
      
      expect(hex1.distanceTo(hex2)).toBeGreaterThan(1);
    });

    it('devrait vérifier l\'égalité correctement', () => {
      const hex1 = new HexCoord(3, 5);
      const hex2 = new HexCoord(3, 5);
      const hex3 = new HexCoord(3, 6);
      
      expect(hex1.equals(hex2)).toBe(true);
      expect(hex1.equals(hex3)).toBe(false);
    });

    it('devrait générer des hash codes uniques pour des coordonnées différentes', () => {
      const hex1 = new HexCoord(0, 0);
      const hex2 = new HexCoord(1, 0);
      const hex3 = new HexCoord(0, 1);
      
      expect(hex1.hashCode()).not.toBe(hex2.hashCode());
      expect(hex1.hashCode()).not.toBe(hex3.hashCode());
      expect(hex2.hashCode()).not.toBe(hex3.hashCode());
    });

    it('devrait générer le même hash code pour des coordonnées égales', () => {
      const hex1 = new HexCoord(5, 7);
      const hex2 = new HexCoord(5, 7);
      
      expect(hex1.hashCode()).toBe(hex2.hashCode());
    });
  });
});
