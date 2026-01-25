import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Make7HexesMapWith5CitiesAndLibraries } from '../utils/GameProgressionTest';
import { CityLevel } from '../../src/model/city/CityLevel';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceHarvestController } from '../../src/controller/ResourceHarvestController';
import { PrestigeController } from '../../src/controller/PrestigeController';
import { MainGame } from '../../src/application/MainGame';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  it('permet d\'activer le prestige puis de relancer une partie en conservant les points gagnés', () => {
    const savePath = join(__dirname, '..', '..', 'saves', '7HexesMapWith5CitiesAndLibraries.json');
    const serialized = readFileSync(savePath, 'utf-8');

    const game = new MainGame();
    const loaded = game.loadGame(serialized);
    expect(loaded).toBe(true);

    const map = game.getIslandMap();
    const civId = game.getPlayerCivilizationId();
    expect(map).not.toBeNull();

    // Vérifier que l'IHM autoriserait le prestige
    expect(PrestigeController.canActivatePrestige(civId, map!)).toBe(true);

    const result = PrestigeController.activatePrestige(game.getIslandState());
    expect(result.success).toBe(true);
    expect(result.civilizationPointsGained).toBeGreaterThan(0);

    // Simuler la confirmation utilisateur sur le panneau de prestige
    const gained = result.civilizationPointsGained!;
    const civState = game.getController().getCivilizationState();
    civState.addPrestigePoints(gained);

    // Démarrer une nouvelle partie via l'API applicative (bouton Nouvelle partie)
    const prestigeAvantReset = civState.getPrestigePointsTotal();
    game.newGame(98765);

    const newCivState = game.getController().getCivilizationState();
    expect(newCivState.getPrestigePointsTotal()).toBe(prestigeAvantReset);
    expect(game.getSeed()).toBe(98765);

    // La carte est bien régénérée pour une nouvelle session de jeu
    const newMap = game.getIslandMap();
    expect(newMap).not.toBeNull();
    expect(newMap).not.toBe(map);
  });
});
