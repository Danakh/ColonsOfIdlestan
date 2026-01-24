import { describe, it, expect } from 'vitest';
import { MainHexDirection, inverseMainHexDirection } from '../../../src/model/hex/MainHexDirection';

describe('MainHexDirection', () => {
  describe('inverseMainHexDirection', () => {
    it('devrait inverser W en E', () => {
      expect(inverseMainHexDirection(MainHexDirection.W)).toBe(MainHexDirection.E);
    });

    it('devrait inverser E en W', () => {
      expect(inverseMainHexDirection(MainHexDirection.E)).toBe(MainHexDirection.W);
    });

    it('devrait inverser NE en SW', () => {
      expect(inverseMainHexDirection(MainHexDirection.NE)).toBe(MainHexDirection.SW);
    });

    it('devrait inverser SW en NE', () => {
      expect(inverseMainHexDirection(MainHexDirection.SW)).toBe(MainHexDirection.NE);
    });

    it('devrait inverser NW en SE', () => {
      expect(inverseMainHexDirection(MainHexDirection.NW)).toBe(MainHexDirection.SE);
    });

    it('devrait inverser SE en NW', () => {
      expect(inverseMainHexDirection(MainHexDirection.SE)).toBe(MainHexDirection.NW);
    });

    it('devrait être une involution (l\'inverse de l\'inverse = direction originale)', () => {
      const allDirections = [
        MainHexDirection.W,
        MainHexDirection.E,
        MainHexDirection.NE,
        MainHexDirection.SE,
        MainHexDirection.NW,
        MainHexDirection.SW,
      ];

      for (const dir of allDirections) {
        expect(inverseMainHexDirection(inverseMainHexDirection(dir))).toBe(dir);
      }
    });
  });
});
