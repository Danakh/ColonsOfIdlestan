import { describe, it, expect } from 'vitest';
import { HexDirection, inverseHexDirection } from '../../../src/model/hex/HexDirection';

describe('HexDirection', () => {
  describe('inverseHexDirection', () => {
    it('devrait inverser W en E', () => {
      expect(inverseHexDirection(HexDirection.W)).toBe(HexDirection.E);
    });

    it('devrait inverser E en W', () => {
      expect(inverseHexDirection(HexDirection.E)).toBe(HexDirection.W);
    });

    it('devrait inverser NE en SW', () => {
      expect(inverseHexDirection(HexDirection.NE)).toBe(HexDirection.SW);
    });

    it('devrait inverser SW en NE', () => {
      expect(inverseHexDirection(HexDirection.SW)).toBe(HexDirection.NE);
    });

    it('devrait inverser NW en SE', () => {
      expect(inverseHexDirection(HexDirection.NW)).toBe(HexDirection.SE);
    });

    it('devrait inverser SE en NW', () => {
      expect(inverseHexDirection(HexDirection.SE)).toBe(HexDirection.NW);
    });

    it('devrait être une involution (l\'inverse de l\'inverse = direction originale)', () => {
      const allDirections = [
        HexDirection.W,
        HexDirection.E,
        HexDirection.NE,
        HexDirection.SE,
        HexDirection.NW,
        HexDirection.SW,
      ];

      for (const dir of allDirections) {
        expect(inverseHexDirection(inverseHexDirection(dir))).toBe(dir);
      }
    });
  });
});
