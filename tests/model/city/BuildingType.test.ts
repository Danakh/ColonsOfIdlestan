import { describe, it, expect } from 'vitest';
import { 
  BuildingType, 
  getBuildingCost, 
  getBuildingUpgradeCost,
  getResourceProductionBuildings 
} from '../../../src/model/city/BuildingType';
import { ResourceType } from '../../../src/model/map/ResourceType';

describe('BuildingType - Coûts d\'amélioration', () => {
  describe('getBuildingUpgradeCost', () => {
    it('devrait retourner le coût de base pour une amélioration niveau 1 -> 2', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Sawmill, 1);
      
      // Coût de base pour Sawmill (actuel): Wood: 10, Brick: 10
      expect(cost.get(ResourceType.Wood)).toBe(10);
      expect(cost.get(ResourceType.Brick)).toBe(10);
    });

    it('devrait multiplier le coût par le niveau actuel pour niveau 2 -> 3', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Sawmill, 2);
      
      // Coût de base * 2 pour Sawmill: Wood: 20, Brick: 20
      expect(cost.get(ResourceType.Wood)).toBe(20);
      expect(cost.get(ResourceType.Brick)).toBe(20);
    });

    it('devrait multiplier le coût par le niveau actuel pour niveau 4 -> 5', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Sawmill, 4);
      
      // Coût de base * 4 pour Sawmill: Wood: 40, Brick: 40
      expect(cost.get(ResourceType.Wood)).toBe(40);
      expect(cost.get(ResourceType.Brick)).toBe(40);
    });

    it('devrait avoir des coûts d\'amélioration distincts des coûts de construction', () => {
      const buildCost = getBuildingCost(BuildingType.Sawmill);
      const upgradeCost = getBuildingUpgradeCost(BuildingType.Sawmill, 1);
      
      // Les coûts de construction et d'amélioration sont différents
      // Construction (actuel): Wood: 3, Brick: 5
      // Amélioration (actuel): Wood: 10, Brick: 10
      expect(buildCost.get(ResourceType.Wood)).toBe(3);
      expect(upgradeCost.get(ResourceType.Wood)).toBe(10);
      expect(buildCost.get(ResourceType.Brick)).toBe(5);
      expect(upgradeCost.get(ResourceType.Brick)).toBe(10);
    });

    it('devrait avoir des coûts d\'amélioration pour tous les bâtiments de production', () => {
      const productionBuildings = getResourceProductionBuildings();
      
      for (const buildingType of productionBuildings) {
        const cost = getBuildingUpgradeCost(buildingType, 1);
        expect(cost.size).toBeGreaterThan(0);
      }
    });

    it('devrait avoir des coûts d\'amélioration pour la Mine', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Mine, 1);
      
      // Coût de base pour Mine (actuel): Wood: 10, Ore: 10
      expect(cost.get(ResourceType.Wood)).toBe(10);
      expect(cost.get(ResourceType.Ore)).toBe(10);
    });

    it('devrait avoir des coûts d\'amélioration pour le Moulin', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Mill, 1);
      
      // Coût de base pour Mill (actuel): Wood: 10, Brick: 10
      expect(cost.get(ResourceType.Wood)).toBe(10);
      expect(cost.get(ResourceType.Brick)).toBe(10);
    });

    it('devrait avoir des coûts d\'amélioration pour la Bergerie', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Sheepfold, 1);
      
      // Coût de base pour Sheepfold (actuel): Wood: 10, Brick: 10
      expect(cost.get(ResourceType.Wood)).toBe(10);
      expect(cost.get(ResourceType.Brick)).toBe(10);
    });

    it('devrait avoir des coûts d\'amélioration pour la Briqueterie', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Brickworks, 1);
      
      // Coût de base pour Brickworks (actuel): Ore: 10, Brick: 10
      expect(cost.get(ResourceType.Ore)).toBe(10);
      expect(cost.get(ResourceType.Brick)).toBe(10);
    });
  });
});
