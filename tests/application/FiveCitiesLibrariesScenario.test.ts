import { describe, it, expect, beforeEach } from 'vitest';
import { Make7HexesMapWith5CitiesAndLibraries } from '../utils/GameProgressionTest';
import { CityLevel } from '../../src/model/city/CityLevel';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceHarvestController } from '../../src/controller/ResourceHarvestController';

describe('FiveCitiesLibrariesScenario', () => {
  beforeEach(() => {
    ResourceHarvestController.resetCooldowns();
  });

  it('crée 5 villes avec bibliothèques et un port niveau 4 (4 métropoles + 1 capitale)', () => {
    const gs = Make7HexesMapWith5CitiesAndLibraries();
    const map = gs.getIslandMap()!;
    const civId = gs.getPlayerCivilizationId();

    const cities = map.getCitiesByCivilization(civId);
    expect(cities.length).toBe(5);

    // Vérifier bibliothèques dans toutes les villes
    for (const city of cities) {
      expect(city.hasBuilding(BuildingType.Library)).toBe(true);
    }

    // Vérifier qu'il y a 4 métropoles et 1 capitale
    const metropolisCount = cities.filter(c => c.level === CityLevel.Metropolis).length;
    const capitalCount = cities.filter(c => c.level === CityLevel.Capital).length;
    expect(metropolisCount).toBe(4);
    expect(capitalCount).toBe(1);

    // Vérifier qu'une ville possède un port niveau 4
    const seaportCities = cities.filter(c => c.hasBuilding(BuildingType.Seaport));
    expect(seaportCities.length).toBeGreaterThanOrEqual(1);
    const portCity = seaportCities.find(c => c.getBuilding(BuildingType.Seaport)?.level === 4);
    expect(portCity).toBeDefined();
  });
});
