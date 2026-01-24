import { describe, it, expect } from 'vitest';
import { SecondaryHexDirection, inverseSecondaryHexDirection } from '../../../src/model/hex/SecondaryHexDirection';

describe('SecondaryHexDirection', () => {
  describe('inverseSecondaryHexDirection', () => {
    it('devrait inverser N en S', () => {
      expect(inverseSecondaryHexDirection(SecondaryHexDirection.N)).toBe(SecondaryHexDirection.S);
    });

    it('devrait inverser S en N', () => {
      expect(inverseSecondaryHexDirection(SecondaryHexDirection.S)).toBe(SecondaryHexDirection.N);
    });

    it('devrait inverser EN en WS', () => {
      expect(inverseSecondaryHexDirection(SecondaryHexDirection.EN)).toBe(SecondaryHexDirection.WS);
    });

    it('devrait inverser WS en EN', () => {
      expect(inverseSecondaryHexDirection(SecondaryHexDirection.WS)).toBe(SecondaryHexDirection.EN);
    });

    it('devrait inverser ES en WN', () => {
      expect(inverseSecondaryHexDirection(SecondaryHexDirection.ES)).toBe(SecondaryHexDirection.WN);
    });

    it('devrait inverser WN en ES', () => {
      expect(inverseSecondaryHexDirection(SecondaryHexDirection.WN)).toBe(SecondaryHexDirection.ES);
    });

    it('devrait être une involution (l\'inverse de l\'inverse = direction originale)', () => {
      const allDirections = [
        SecondaryHexDirection.N,
        SecondaryHexDirection.EN,
        SecondaryHexDirection.ES,
        SecondaryHexDirection.S,
        SecondaryHexDirection.WS,
        SecondaryHexDirection.WN,
      ];

      for (const dir of allDirections) {
        expect(inverseSecondaryHexDirection(inverseSecondaryHexDirection(dir))).toBe(dir);
      }
    });
  });
});
