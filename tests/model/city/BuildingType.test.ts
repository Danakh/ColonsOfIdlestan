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
      
      // Coût de base pour Sawmill: Wood: 2, Brick: 3
      expect(cost.get(ResourceType.Wood)).toBe(2);
      expect(cost.get(ResourceType.Brick)).toBe(3);
    });

    it('devrait multiplier le coût par le niveau actuel pour niveau 2 -> 3', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Sawmill, 2);
      
      // Coût de base * 2 pour Sawmill: Wood: 4, Brick: 6
      expect(cost.get(ResourceType.Wood)).toBe(4);
      expect(cost.get(ResourceType.Brick)).toBe(6);
    });

    it('devrait multiplier le coût par le niveau actuel pour niveau 4 -> 5', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Sawmill, 4);
      
      // Coût de base * 4 pour Sawmill: Wood: 8, Brick: 12
      expect(cost.get(ResourceType.Wood)).toBe(8);
      expect(cost.get(ResourceType.Brick)).toBe(12);
    });

    it('devrait avoir des coûts d\'amélioration distincts des coûts de construction', () => {
      const buildCost = getBuildingCost(BuildingType.Sawmill);
      const upgradeCost = getBuildingUpgradeCost(BuildingType.Sawmill, 1);
      
      // Les coûts de construction et d'amélioration sont différents
      // Construction: Wood: 3, Brick: 4
      // Amélioration: Wood: 2, Brick: 3
      expect(buildCost.get(ResourceType.Wood)).toBe(3);
      expect(upgradeCost.get(ResourceType.Wood)).toBe(2);
      expect(buildCost.get(ResourceType.Brick)).toBe(4);
      expect(upgradeCost.get(ResourceType.Brick)).toBe(3);
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
      
      // Coût de base pour Mine: Wood: 2, Ore: 2
      expect(cost.get(ResourceType.Wood)).toBe(2);
      expect(cost.get(ResourceType.Ore)).toBe(2);
    });

    it('devrait avoir des coûts d\'amélioration pour le Moulin', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Mill, 1);
      
      // Coût de base pour Mill: Wood: 2, Brick: 4
      expect(cost.get(ResourceType.Wood)).toBe(2);
      expect(cost.get(ResourceType.Brick)).toBe(4);
    });

    it('devrait avoir des coûts d\'amélioration pour la Bergerie', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Sheepfold, 1);
      
      // Coût de base pour Sheepfold: Wood: 4, Brick: 2
      expect(cost.get(ResourceType.Wood)).toBe(4);
      expect(cost.get(ResourceType.Brick)).toBe(2);
    });

    it('devrait avoir des coûts d\'amélioration pour la Briqueterie', () => {
      const cost = getBuildingUpgradeCost(BuildingType.Brickworks, 1);
      
      // Coût de base pour Brickworks: Ore: 1, Brick: 4
      expect(cost.get(ResourceType.Ore)).toBe(1);
      expect(cost.get(ResourceType.Brick)).toBe(4);
    });
  });
});
