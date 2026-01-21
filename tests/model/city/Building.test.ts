import { describe, it, expect } from 'vitest';
import { Building } from '../../../src/model/city/Building';
import { BuildingType } from '../../../src/model/city/BuildingType';
import { ResourceType } from '../../../src/model/map/ResourceType';

describe('Building', () => {
  describe('constructor', () => {
    it('devrait créer un bâtiment avec le type spécifié et niveau 1 par défaut', () => {
      const building = new Building(BuildingType.Sawmill);
      expect(building.type).toBe(BuildingType.Sawmill);
      expect(building.level).toBe(1);
    });

    it('devrait créer un bâtiment avec un niveau spécifié', () => {
      const building = new Building(BuildingType.Mine, 5);
      expect(building.type).toBe(BuildingType.Mine);
      expect(building.level).toBe(5);
    });

    it('devrait lever une erreur si le niveau est inférieur à 1', () => {
      expect(() => new Building(BuildingType.Sawmill, 0)).toThrow('Le niveau doit être au moins 1.');
      expect(() => new Building(BuildingType.Sawmill, -1)).toThrow('Le niveau doit être au moins 1.');
    });

    it('devrait lever une erreur si le niveau dépasse la limite (production max=5)', () => {
      expect(() => new Building(BuildingType.Sawmill, 6)).toThrow('Le niveau ne peut pas dépasser 5.');
    });

    it('devrait lever une erreur si le niveau dépasse la limite (non-production max=1)', () => {
      expect(() => new Building(BuildingType.Market, 2)).toThrow('Le niveau ne peut pas dépasser 1.');
    });
  });

  describe('canUpgrade', () => {
    it('devrait retourner true pour un bâtiment de production niveau 1', () => {
      const building = new Building(BuildingType.Sawmill);
      expect(building.canUpgrade()).toBe(true);
    });

    it('devrait retourner false pour un bâtiment de production au niveau max (5)', () => {
      const building = new Building(BuildingType.Sawmill, 5);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait retourner false pour un bâtiment non-producteur (max=1)', () => {
      const building = new Building(BuildingType.Market, 1);
      expect(building.canUpgrade()).toBe(false);
    });
  });

  describe('upgrade', () => {
    it('devrait augmenter le niveau de 1', () => {
      const building = new Building(BuildingType.Sawmill);
      building.upgrade();
      expect(building.level).toBe(2);
    });

    it('devrait permettre plusieurs améliorations successives jusqu’au niveau 5', () => {
      const building = new Building(BuildingType.Sawmill);
      building.upgrade(); // 2
      building.upgrade(); // 3
      building.upgrade(); // 4
      building.upgrade(); // 5
      expect(building.level).toBe(5);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait lever une erreur si on essaie de dépasser le niveau max', () => {
      const building = new Building(BuildingType.Sawmill, 5);
      expect(() => building.upgrade()).toThrow('Le bâtiment Sawmill est déjà au niveau maximum (5).');
    });

    it('devrait lever une erreur pour un bâtiment non-producteur (max=1)', () => {
      const building = new Building(BuildingType.Market, 1);
      expect(() => building.upgrade()).toThrow('Le bâtiment Market est déjà au niveau maximum (1).');
    });
  });

  describe('getUpgradeCost', () => {
    it('devrait retourner le coût de base pour un bâtiment niveau 1', () => {
      const building = new Building(BuildingType.Sawmill);
      const cost = building.getUpgradeCost();
      
      // Coût de base pour Sawmill: Wood: 2, Brick: 3
      expect(cost.get(ResourceType.Wood)).toBe(2);
      expect(cost.get(ResourceType.Brick)).toBe(3);
    });

    it('devrait retourner le coût multiplié par le niveau pour un bâtiment niveau 2', () => {
      const building = new Building(BuildingType.Sawmill, 2);
      const cost = building.getUpgradeCost();
      
      // Coût de base * 2 pour Sawmill: Wood: 4, Brick: 6
      expect(cost.get(ResourceType.Wood)).toBe(4);
      expect(cost.get(ResourceType.Brick)).toBe(6);
    });

    it('devrait retourner le coût multiplié par le niveau pour un bâtiment niveau 4 (upgrade 4 -> 5)', () => {
      const building = new Building(BuildingType.Sawmill, 4);
      const cost = building.getUpgradeCost();
      
      // Coût de base * 4 pour Sawmill: Wood: 8, Brick: 12
      expect(cost.get(ResourceType.Wood)).toBe(8);
      expect(cost.get(ResourceType.Brick)).toBe(12);
    });

    it('devrait lever une erreur si le bâtiment est au niveau max', () => {
      const building = new Building(BuildingType.Sawmill, 5);
      expect(() => building.getUpgradeCost()).toThrow('Le bâtiment Sawmill est déjà au niveau maximum (5).');
    });

    it('devrait lever une erreur pour un bâtiment non-producteur (max=1)', () => {
      const building = new Building(BuildingType.Market, 1);
      expect(() => building.getUpgradeCost()).toThrow('Le bâtiment Market est déjà au niveau maximum (1).');
    });
  });

  describe('setLevel', () => {
    it('devrait définir le niveau du bâtiment', () => {
      const building = new Building(BuildingType.Sawmill);
      building.setLevel(5);
      expect(building.level).toBe(5);
    });

    it('devrait lever une erreur si le niveau est inférieur à 1', () => {
      const building = new Building(BuildingType.Sawmill);
      expect(() => building.setLevel(0)).toThrow('Le niveau doit être au moins 1.');
    });

    it('devrait lever une erreur si le niveau dépasse le max', () => {
      const building = new Building(BuildingType.Sawmill);
      expect(() => building.setLevel(6)).toThrow('Le niveau ne peut pas dépasser 5.');
    });
  });

  describe('equals', () => {
    it('devrait retourner true pour deux bâtiments du même type', () => {
      const building1 = new Building(BuildingType.Sawmill);
      const building2 = new Building(BuildingType.Sawmill, 5);
      expect(building1.equals(building2)).toBe(true);
    });

    it('devrait retourner false pour deux bâtiments de types différents', () => {
      const building1 = new Building(BuildingType.Sawmill);
      const building2 = new Building(BuildingType.Mine);
      expect(building1.equals(building2)).toBe(false);
    });
  });

  describe('productionTimeSeconds', () => {
    it('devrait retourner undefined par défaut', () => {
      const building = new Building(BuildingType.Sawmill);
      expect(building.getProductionTimeSeconds()).toBeUndefined();
    });

    it('devrait permettre de définir et lire le temps de production', () => {
      const building = new Building(BuildingType.Sawmill);
      building.setProductionTimeSeconds(12.34);
      expect(building.getProductionTimeSeconds()).toBe(12.34);
    });

    it('devrait permettre de mettre à jour le temps de production', () => {
      const building = new Building(BuildingType.Sawmill);
      building.setProductionTimeSeconds(1.0);
      building.updateProductionTimeSeconds(2.5);
      expect(building.getProductionTimeSeconds()).toBe(2.5);
    });
  });

  describe('serialize', () => {
    it('devrait déléguer la sérialisation du building', () => {
      const building = new Building(BuildingType.Sawmill, 3);
      building.setProductionTimeSeconds(42);

      const serialized = building.serialize();
      expect(serialized.type).toBe(BuildingType.Sawmill);
      expect(serialized.level).toBe(3);
      expect(serialized.productionTimeSeconds).toBe(42);
    });
  });

  describe('toString', () => {
    it('devrait retourner une représentation lisible', () => {
      const building = new Building(BuildingType.Sawmill, 3);
      expect(building.toString()).toBe('Building(type=Sawmill, level=3)');
    });
  });
});
