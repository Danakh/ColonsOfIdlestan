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

    it('devrait lever une erreur si le niveau dépasse la limite (Market max=2)', () => {
      expect(() => new Building(BuildingType.Market, 3)).toThrow('Le niveau ne peut pas dépasser 2.');
    });

    it('devrait lever une erreur si le niveau dépasse la limite (TownHall max=4)', () => {
      expect(() => new Building(BuildingType.TownHall, 5)).toThrow('Le niveau ne peut pas dépasser 4.');
    });

    it('devrait lever une erreur si le niveau dépasse la limite (Seaport max=4)', () => {
      expect(() => new Building(BuildingType.Seaport, 5)).toThrow('Le niveau ne peut pas dépasser 4.');
    });

    it('devrait lever une erreur si le niveau dépasse la limite (BuildersGuild max=3)', () => {
      expect(() => new Building(BuildingType.BuildersGuild, 4)).toThrow('Le niveau ne peut pas dépasser 3.');
    });

    it('devrait lever une erreur si le niveau dépasse la limite (non-production max=1)', () => {
      expect(() => new Building(BuildingType.Warehouse, 2)).toThrow('Le niveau ne peut pas dépasser 1.');
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

    it('devrait retourner true pour un bâtiment Market niveau 1 (max=2)', () => {
      const building = new Building(BuildingType.Market, 1);
      expect(building.canUpgrade()).toBe(true);
    });

    it('devrait retourner false pour un bâtiment Market niveau 2 (max=2)', () => {
      const building = new Building(BuildingType.Market, 2);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait retourner true pour un bâtiment TownHall niveau 1 (max=4)', () => {
      const building = new Building(BuildingType.TownHall, 1);
      expect(building.canUpgrade()).toBe(true);
    });

    it('devrait retourner false pour un bâtiment TownHall niveau 4 (max=4)', () => {
      const building = new Building(BuildingType.TownHall, 4);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait retourner true pour un bâtiment Seaport niveau 1 (max=4)', () => {
      const building = new Building(BuildingType.Seaport, 1);
      expect(building.canUpgrade()).toBe(true);
    });

    it('devrait retourner true pour un bâtiment Seaport niveau 3 (max=4)', () => {
      const building = new Building(BuildingType.Seaport, 3);
      expect(building.canUpgrade()).toBe(true);
    });

    it('devrait retourner false pour un bâtiment Seaport niveau 4 (max=4)', () => {
      const building = new Building(BuildingType.Seaport, 4);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait retourner true pour un bâtiment BuildersGuild niveau 1 (max=3)', () => {
      const building = new Building(BuildingType.BuildersGuild, 1);
      expect(building.canUpgrade()).toBe(true);
    });

    it('devrait retourner false pour un bâtiment BuildersGuild niveau 3 (max=3)', () => {
      const building = new Building(BuildingType.BuildersGuild, 3);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait retourner false pour un bâtiment non-producteur (max=1)', () => {
      const building = new Building(BuildingType.Warehouse, 1);
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

    it('devrait permettre d\'améliorer Market de 1 à 2', () => {
      const building = new Building(BuildingType.Market, 1);
      building.upgrade();
      expect(building.level).toBe(2);
    });

    it('devrait lever une erreur pour un bâtiment Market niveau 2 (max=2)', () => {
      const building = new Building(BuildingType.Market, 2);
      expect(() => building.upgrade()).toThrow('Le bâtiment Market est déjà au niveau maximum (2).');
    });

    it('devrait permettre d\'améliorer TownHall jusqu\'au niveau 4', () => {
      const building = new Building(BuildingType.TownHall, 1);
      building.upgrade(); // 2
      building.upgrade(); // 3
      building.upgrade(); // 4
      expect(building.level).toBe(4);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait lever une erreur pour un bâtiment TownHall niveau 4 (max=4)', () => {
      const building = new Building(BuildingType.TownHall, 4);
      expect(() => building.upgrade()).toThrow('Le bâtiment TownHall est déjà au niveau maximum (4).');
    });

    it('devrait permettre d\'améliorer Seaport jusqu\'au niveau 4 (avec spécialisation requise au niveau 2)', () => {
      const building = new Building(BuildingType.Seaport, 1);
      building.upgrade(); // 2
      // Le Seaport niveau 2 nécessite une spécialisation pour passer au niveau 3
      building.setSpecialization(ResourceType.Wood);
      expect(building.canUpgrade()).toBe(true);
      building.upgrade(); // 3
      expect(building.level).toBe(3);
      expect(building.canUpgrade()).toBe(true);
      building.upgrade(); // 4
      expect(building.level).toBe(4);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait retourner false pour canUpgrade si Seaport niveau 2 n\'a pas de spécialisation', () => {
      const building = new Building(BuildingType.Seaport, 2);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait lever une erreur pour un bâtiment Seaport niveau 4 (max=4)', () => {
      const building = new Building(BuildingType.Seaport, 4);
      expect(() => building.upgrade()).toThrow('Le bâtiment Seaport est déjà au niveau maximum (4).');
    });

    it('devrait permettre d\'améliorer BuildersGuild jusqu\'au niveau 3', () => {
      const building = new Building(BuildingType.BuildersGuild, 1);
      building.upgrade(); // 2
      building.upgrade(); // 3
      expect(building.level).toBe(3);
      expect(building.canUpgrade()).toBe(false);
    });

    it('devrait lever une erreur pour un bâtiment BuildersGuild niveau 3 (max=3)', () => {
      const building = new Building(BuildingType.BuildersGuild, 3);
      expect(() => building.upgrade()).toThrow('Le bâtiment BuildersGuild est déjà au niveau maximum (3).');
    });

    it('devrait lever une erreur pour un bâtiment non-producteur (max=1)', () => {
      const building = new Building(BuildingType.Warehouse, 1);
      expect(() => building.upgrade()).toThrow('Le bâtiment Warehouse est déjà au niveau maximum (1).');
    });
  });

  describe('getUpgradeCost', () => {
    it('devrait retourner le coût de base pour un bâtiment niveau 1', () => {
      const building = new Building(BuildingType.Sawmill);
      const cost = building.getUpgradeCost();
      
      // Coût de base pour Sawmill (actuel): Wood: 10, Brick: 10
      expect(cost.get(ResourceType.Wood)).toBe(10);
      expect(cost.get(ResourceType.Brick)).toBe(10);
    });

    it('devrait retourner le coût multiplié par le niveau pour un bâtiment niveau 2', () => {
      const building = new Building(BuildingType.Sawmill, 2);
      const cost = building.getUpgradeCost();
      
      // Coût de base * 2 pour Sawmill: Wood: 20, Brick: 20
      expect(cost.get(ResourceType.Wood)).toBe(20);
      expect(cost.get(ResourceType.Brick)).toBe(20);
    });

    it('devrait retourner le coût multiplié par le niveau pour un bâtiment niveau 4 (upgrade 4 -> 5)', () => {
      const building = new Building(BuildingType.Sawmill, 4);
      const cost = building.getUpgradeCost();
      
      // Coût de base * 4 pour Sawmill: Wood: 40, Brick: 40
      expect(cost.get(ResourceType.Wood)).toBe(40);
      expect(cost.get(ResourceType.Brick)).toBe(40);
    });

    it('devrait lever une erreur si le bâtiment est au niveau max', () => {
      const building = new Building(BuildingType.Sawmill, 5);
      expect(() => building.getUpgradeCost()).toThrow('Le bâtiment Sawmill est déjà au niveau maximum (5).');
    });

    it('devrait retourner le coût d\'amélioration pour Market niveau 1', () => {
      const building = new Building(BuildingType.Market, 1);
      const cost = building.getUpgradeCost();
      // Coût de base * 1 pour Market: Wood: 4, Brick: 2
      // Coût de base * 1 pour Market (actuel): Wood: 5, Brick: 5
      expect(cost.get(ResourceType.Wood)).toBe(5);
      expect(cost.get(ResourceType.Brick)).toBe(5);
    });

    it('devrait lever une erreur pour un bâtiment Market niveau 2 (max=2)', () => {
      const building = new Building(BuildingType.Market, 2);
      expect(() => building.getUpgradeCost()).toThrow('Le bâtiment Market est déjà au niveau maximum (2).');
    });

    it('devrait retourner le coût d\'amélioration pour TownHall niveau 1', () => {
      const building = new Building(BuildingType.TownHall, 1);
      const cost = building.getUpgradeCost();
      // Coût de base * 1 pour TownHall: Wood: 4, Brick: 4, Ore: 2
      expect(cost.get(ResourceType.Wood)).toBe(4);
      expect(cost.get(ResourceType.Brick)).toBe(4);
      expect(cost.get(ResourceType.Ore)).toBe(2);
    });

    it('devrait retourner le coût d\'amélioration pour TownHall niveau 3 (upgrade 3 -> 4)', () => {
      const building = new Building(BuildingType.TownHall, 3);
      const cost = building.getUpgradeCost();
      // Coût de base * 3 pour TownHall: Wood: 12, Brick: 12, Ore: 6
      expect(cost.get(ResourceType.Wood)).toBe(12);
      expect(cost.get(ResourceType.Brick)).toBe(12);
      expect(cost.get(ResourceType.Ore)).toBe(6);
    });

    it('devrait lever une erreur pour un bâtiment TownHall niveau 4 (max=4)', () => {
      const building = new Building(BuildingType.TownHall, 4);
      expect(() => building.getUpgradeCost()).toThrow('Le bâtiment TownHall est déjà au niveau maximum (4).');
    });

    it('devrait retourner le coût d\'amélioration pour Seaport niveau 1', () => {
      const building = new Building(BuildingType.Seaport, 1);
      const cost = building.getUpgradeCost();
      // Coût de base * 1 pour Seaport: Ore: 12, Wood: 16, Brick: 12, Sheep: 4
      // Coût de base * 1 pour Seaport (actuel): Ore: 20, Wood: 20, Brick: 10, Sheep: 10
      expect(cost.get(ResourceType.Ore)).toBe(20);
      expect(cost.get(ResourceType.Wood)).toBe(20);
      expect(cost.get(ResourceType.Brick)).toBe(10);
      expect(cost.get(ResourceType.Sheep)).toBe(10);
    });

    it('devrait lever une erreur pour un bâtiment Seaport niveau 4 (max=4)', () => {
      const building = new Building(BuildingType.Seaport, 4);
      expect(() => building.getUpgradeCost()).toThrow('Le bâtiment Seaport est déjà au niveau maximum (4).');
    });

    it('devrait retourner le coût d\'amélioration pour BuildersGuild niveau 1', () => {
      const building = new Building(BuildingType.BuildersGuild, 1);
      const cost = building.getUpgradeCost();
      // Coût de base * 1 pour BuildersGuild: Wood: 12, Brick: 12, Ore: 8
      // Coût de base * 1 pour BuildersGuild (actuel): Brick: 10, Ore: 10, Sheep: 10, Wheat: 10
      expect(cost.get(ResourceType.Brick)).toBe(10);
      expect(cost.get(ResourceType.Ore)).toBe(10);
      expect(cost.get(ResourceType.Sheep)).toBe(10);
    });

    it('devrait lever une erreur pour un bâtiment BuildersGuild niveau 3 (max=3)', () => {
      const building = new Building(BuildingType.BuildersGuild, 3);
      expect(() => building.getUpgradeCost()).toThrow('Le bâtiment BuildersGuild est déjà au niveau maximum (3).');
    });

    it('devrait lever une erreur pour un bâtiment non-producteur (max=1)', () => {
      const building = new Building(BuildingType.Warehouse, 1);
      expect(() => building.getUpgradeCost()).toThrow('Le bâtiment Warehouse est déjà au niveau maximum (1).');
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

    it('devrait lever une erreur si le niveau dépasse le max (production)', () => {
      const building = new Building(BuildingType.Sawmill);
      expect(() => building.setLevel(6)).toThrow('Le niveau ne peut pas dépasser 5.');
    });

    it('devrait lever une erreur si le niveau dépasse le max (Market)', () => {
      const building = new Building(BuildingType.Market);
      expect(() => building.setLevel(3)).toThrow('Le niveau ne peut pas dépasser 2.');
    });

    it('devrait lever une erreur si le niveau dépasse le max (TownHall)', () => {
      const building = new Building(BuildingType.TownHall);
      expect(() => building.setLevel(5)).toThrow('Le niveau ne peut pas dépasser 4.');
    });

    it('devrait lever une erreur si le niveau dépasse le max (Seaport)', () => {
      const building = new Building(BuildingType.Seaport);
      expect(() => building.setLevel(5)).toThrow('Le niveau ne peut pas dépasser 4.');
    });

    it('devrait lever une erreur si le niveau dépasse le max (BuildersGuild)', () => {
      const building = new Building(BuildingType.BuildersGuild);
      expect(() => building.setLevel(4)).toThrow('Le niveau ne peut pas dépasser 3.');
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
