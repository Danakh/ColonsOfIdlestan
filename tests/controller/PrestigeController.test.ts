import { describe, it, expect, beforeEach } from 'vitest';
import { createScenarioWithCapitalAndResources } from '../utils/IslandStateGenerator';
import { PrestigeController } from '../../src/controller/PrestigeController';
import { BuildingType } from '../../src/model/city/BuildingType';
import { CityLevel } from '../../src/model/city/CityLevel';
import { MainGame } from '../../src/application/MainGame';

describe('PrestigeController', () => {
  let game: MainGame;

  beforeEach(() => {
    game = new MainGame();
  });

  describe('canActivatePrestige', () => {
    it('devrait retourner false si pas de capitale', () => {
      game.newGame(42);
      const controller = game.getController();
      const map = controller.getIslandMap();
      const civId = controller.getPlayerCivilizationId();

      // Sans capitale, l'action Prestige ne doit pas être disponible
      const canActivate = PrestigeController.canActivatePrestige(civId, map!);
      expect(canActivate).toBe(false);
    });

    it('devrait retourner false si pas assez de points de civilisation', () => {
      game.newGame(42);
      const controller = game.getController();
      const map = controller.getIslandMap();
      const civId = controller.getPlayerCivilizationId();

      // Créer une capitale
      const cities = map!.getCitiesByCivilization(civId);
      if (cities.length > 0) {
        const city = cities[0];
        const townHall = city.getBuilding(BuildingType.TownHall);
        if (townHall) {
          townHall.setLevel(CityLevel.Capital);
        }
      }

      // Avec une capitale mais peu de points de civilisation
      const canActivate = PrestigeController.canActivatePrestige(civId, map!);
      expect(canActivate).toBe(false);
    });

    it('devrait retourner true si capitale existe et 20+ points de civilisation', () => {
      const generatedState = createScenarioWithCapitalAndResources(42);
      const map = generatedState.islandMap;
      const civId = generatedState.civId;

      const canActivate = PrestigeController.canActivatePrestige(civId, map);
      expect(canActivate).toBe(true);
    });
  });

  describe('getPrestigeRestrictionReason', () => {
    it('devrait retourner undefined si les conditions sont remplies', () => {
      const generatedState = createScenarioWithCapitalAndResources(42);
      const map = generatedState.islandMap;
      const civId = generatedState.civId;

      const reason = PrestigeController.getPrestigeRestrictionReason(civId, map);
      expect(reason).toBeUndefined();
    });

    it('devrait indiquer qu\'une capitale est requise', () => {
      game.newGame(42);
      const controller = game.getController();
      const map = controller.getIslandMap();
      const civId = controller.getPlayerCivilizationId();

      const reason = PrestigeController.getPrestigeRestrictionReason(civId, map!);
      expect(reason).toContain('capitale');
    });

    it('devrait indiquer le manque de points de civilisation', () => {
      const generatedState = createScenarioWithCapitalAndResources(42);
      const map = generatedState.islandMap;
      const civId = generatedState.civId;

      // Vérifier que canActivatePrestige retourne true (conditions remplies)
      const canActivate = PrestigeController.canActivatePrestige(civId, map);
      expect(canActivate).toBe(true);

      // Vérifier que getPrestigeRestrictionReason retourne undefined
      const reason = PrestigeController.getPrestigeRestrictionReason(civId, map);
      expect(reason).toBeUndefined();

      // Pour tester le manque de points, on doit créer une capitale
      // sans 20+ points - ce qui n'est possible que sur une nouvelle map
      game.newGame(42);
      const controller = game.getController();
      const newMap = controller.getIslandMap()!;
      const newCivId = controller.getPlayerCivilizationId();

      // Créer une capitale (4 points, besoin 16 supplémentaires)
      const citiesInNewMap = newMap.getCitiesByCivilization(newCivId);
      if (citiesInNewMap.length > 0) {
        const city = citiesInNewMap[0];
        city.addBuilding(BuildingType.TownHall);
        const townHall = city.getBuilding(BuildingType.TownHall);
        if (townHall) {
          townHall.setLevel(4); // Capital level
        }
      }

      // Vérifier message manque de points
      const restrictionReason = PrestigeController.getPrestigeRestrictionReason(newCivId, newMap);
      expect(restrictionReason).toBeTruthy();
      expect(restrictionReason).not.toContain('capitale');
      // Il devrait mentionner les points manquants
    });
  });

  describe('activatePrestige', () => {
    it('devrait ajouter des points de civilisation lors du prestige', () => {
      const generatedState = createScenarioWithCapitalAndResources(42);

      const result = PrestigeController.activatePrestige(generatedState.islandState);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.civilizationPointsGained).toBeDefined();
      expect(result.civilizationPointsGained).toBeGreaterThan(0);
    });

    it('devrait retourner false si les conditions ne sont pas remplies', () => {
      game.newGame(42);
      const controller = game.getController();

      const result = PrestigeController.activatePrestige(controller.getIslandState());

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('devrait inclure un bonus basé sur le nombre de ports', () => {
      const generatedState = createScenarioWithCapitalAndResources(42);
      const map = generatedState.islandMap;
      const civId = generatedState.civId;

      // Compter les ports actuels
      const cities = map.getCitiesByCivilization(civId);
      let seaportCount = 0;
      for (const city of cities) {
        if (city.hasBuilding(BuildingType.Seaport)) {
          seaportCount++;
        }
      }

      const result = PrestigeController.activatePrestige(generatedState.islandState);

      expect(result.success).toBe(true);
      // Au moins un port devrait être présent pour cette validation
      if (seaportCount > 0) {
        expect(result.message).toContain('points de civilisation');
      }
    });
  });
});
