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
  });

  describe('canUpgrade', () => {
    it('devrait retourner true pour un bâtiment niveau 1', () => {
      const building = new Building(BuildingType.Sawmill);
      expect(building.canUpgrade()).toBe(true);
    });

    it('devrait retourner true pour un bâtiment de haut niveau', () => {
      const building = new Building(BuildingType.Sawmill, 10);
      expect(building.canUpgrade()).toBe(true);
    });
  });

  describe('upgrade', () => {
    it('devrait augmenter le niveau de 1', () => {
      const building = new Building(BuildingType.Sawmill);
      building.upgrade();
      expect(building.level).toBe(2);
    });

    it('devrait permettre plusieurs améliorations successives', () => {
      const building = new Building(BuildingType.Sawmill);
      building.upgrade();
      building.upgrade();
      building.upgrade();
      expect(building.level).toBe(4);
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

    it('devrait retourner le coût multiplié par le niveau pour un bâtiment niveau 5', () => {
      const building = new Building(BuildingType.Sawmill, 5);
      const cost = building.getUpgradeCost();
      
      // Coût de base * 5 pour Sawmill: Wood: 10, Brick: 15
      expect(cost.get(ResourceType.Wood)).toBe(10);
      expect(cost.get(ResourceType.Brick)).toBe(15);
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

  describe('serialize / deserialize', () => {
    it('devrait sérialiser correctement un bâtiment', () => {
      const building = new Building(BuildingType.Sawmill, 3);
      const serialized = building.serialize();
      
      expect(serialized.type).toBe(BuildingType.Sawmill);
      expect(serialized.level).toBe(3);
    });

    it('devrait désérialiser correctement un bâtiment', () => {
      const data = { type: BuildingType.Mine, level: 7 };
      const building = Building.deserialize(data);
      
      expect(building.type).toBe(BuildingType.Mine);
      expect(building.level).toBe(7);
    });

    it('devrait préserver les données après sérialisation/désérialisation', () => {
      const original = new Building(BuildingType.Mill, 4);
      const serialized = original.serialize();
      const restored = Building.deserialize(serialized);
      
      expect(restored.type).toBe(original.type);
      expect(restored.level).toBe(original.level);
    });
  });

  describe('toString', () => {
    it('devrait retourner une représentation lisible', () => {
      const building = new Building(BuildingType.Sawmill, 3);
      expect(building.toString()).toBe('Building(type=Sawmill, level=3)');
    });
  });
});
