import { describe, it, expect, beforeEach } from 'vitest';
import { City } from '../../../src/model/city/City';
import { CityLevel } from '../../../src/model/city/CityLevel';
import { BuildingType } from '../../../src/model/city/BuildingType';
import { CivilizationId } from '../../../src/model/map/CivilizationId';
import { Vertex } from '../../../src/model/hex/Vertex';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection } from '../../../src/model/hex/HexDirection';

describe('City - Niveaux de bâtiments', () => {
  let city: City;
  let vertex: Vertex;
  let civId: CivilizationId;

  beforeEach(() => {
    const center = new HexCoord(0, 0);
    const north = center.neighbor(HexDirection.N);
    const northeast = center.neighbor(HexDirection.NE);
    vertex = Vertex.create(center, north, northeast);
    civId = CivilizationId.create('test-civ');
    city = new City(vertex, civId, CityLevel.Colony);
  });

  describe('getBuildingLevel', () => {
    it('devrait retourner undefined pour un bâtiment non construit', () => {
      expect(city.getBuildingLevel(BuildingType.Sawmill)).toBeUndefined();
    });

    it('devrait retourner 1 pour un bâtiment nouvellement construit', () => {
      city.addBuilding(BuildingType.Sawmill);
      expect(city.getBuildingLevel(BuildingType.Sawmill)).toBe(1);
    });
  });

  describe('upgradeBuilding', () => {
    it('devrait augmenter le niveau du bâtiment de 1', () => {
      city.addBuilding(BuildingType.Sawmill);
      city.upgradeBuilding(BuildingType.Sawmill);
      expect(city.getBuildingLevel(BuildingType.Sawmill)).toBe(2);
    });

    it('devrait permettre plusieurs améliorations successives', () => {
      city.addBuilding(BuildingType.Sawmill);
      city.upgradeBuilding(BuildingType.Sawmill);
      city.upgradeBuilding(BuildingType.Sawmill);
      city.upgradeBuilding(BuildingType.Sawmill);
      expect(city.getBuildingLevel(BuildingType.Sawmill)).toBe(4);
    });

    it('devrait lever une erreur si le bâtiment n\'est pas construit', () => {
      expect(() => city.upgradeBuilding(BuildingType.Sawmill)).toThrow(
        'Le bâtiment Sawmill n\'est pas construit dans cette ville.'
      );
    });
  });

  describe('canUpgradeBuilding', () => {
    it('devrait retourner false si le bâtiment n\'est pas construit', () => {
      expect(city.canUpgradeBuilding(BuildingType.Sawmill)).toBe(false);
    });

    it('devrait retourner true si le bâtiment est construit', () => {
      city.addBuilding(BuildingType.Sawmill);
      expect(city.canUpgradeBuilding(BuildingType.Sawmill)).toBe(true);
    });

    it('devrait retourner true même pour un bâtiment de haut niveau', () => {
      city.addBuilding(BuildingType.Sawmill);
      for (let i = 0; i < 10; i++) {
        city.upgradeBuilding(BuildingType.Sawmill);
      }
      expect(city.canUpgradeBuilding(BuildingType.Sawmill)).toBe(true);
    });
  });

  describe('setBuildingLevel', () => {
    it('devrait définir le niveau du bâtiment', () => {
      city.addBuilding(BuildingType.Sawmill);
      city.setBuildingLevel(BuildingType.Sawmill, 5);
      expect(city.getBuildingLevel(BuildingType.Sawmill)).toBe(5);
    });

    it('devrait lever une erreur si le bâtiment n\'est pas construit', () => {
      expect(() => city.setBuildingLevel(BuildingType.Sawmill, 3)).toThrow(
        'Le bâtiment Sawmill n\'est pas construit dans cette ville.'
      );
    });

    it('devrait lever une erreur si le niveau est inférieur à 1', () => {
      city.addBuilding(BuildingType.Sawmill);
      expect(() => city.setBuildingLevel(BuildingType.Sawmill, 0)).toThrow(
        'Le niveau doit être au moins 1.'
      );
    });
  });

  describe('serialize', () => {
    it('devrait inclure les niveaux des bâtiments dans la sérialisation', () => {
      city.addBuilding(BuildingType.Sawmill);
      city.upgradeBuilding(BuildingType.Sawmill);
      city.upgradeBuilding(BuildingType.Sawmill);
      
      const serialized = city.serialize();
      
      expect(serialized.buildings).toBeDefined();
      expect(serialized.buildings.length).toBe(1);
      const sawmill = serialized.buildings.find(b => b.type === BuildingType.Sawmill);
      expect(sawmill).toBeDefined();
      expect(sawmill!.level).toBe(3);
    });

    it('devrait inclure les niveaux de tous les bâtiments', () => {
      city.addBuilding(BuildingType.Sawmill);
      city.addBuilding(BuildingType.Mine);
      city.upgradeBuilding(BuildingType.Sawmill);
      
      const serialized = city.serialize();
      
      expect(serialized.buildings.length).toBe(2);
      const sawmill = serialized.buildings.find(b => b.type === BuildingType.Sawmill);
      const mine = serialized.buildings.find(b => b.type === BuildingType.Mine);
      expect(sawmill!.level).toBe(2);
      expect(mine!.level).toBe(1);
    });
  });
});
