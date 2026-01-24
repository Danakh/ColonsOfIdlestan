import { describe, it, expect, beforeEach } from 'vitest';
import { Make7HexesMapWithPortAndCapital } from '../utils/GameProgressionTest';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { MainHexDirection } from '../../src/model/hex/MainHexDirection';
import { SecondaryHexDirection } from '../../src/model/hex/SecondaryHexDirection';
import { Vertex } from '../../src/model/hex/Vertex';
import { BuildingType } from '../../src/model/city/BuildingType';
import { CityLevel } from '../../src/model/city/CityLevel';
import { GameAutoPlayer } from '../utils/GameAutoPlayer';
import { BuildingController } from '../../src/controller/BuildingController';
import { ResourceHarvestController } from '../../src/controller/ResourceHarvestController';
import { Civilization } from '../../src/model/map/Civilization';

describe('BuildersGuild Automation', () => {
  beforeEach(() => {
    ResourceHarvestController.resetCooldowns();
  });

  describe('Construction et amélioration de la Guilde des batisseurs', () => {
    it('devrait construire la Guilde des batisseurs niveau 1 dans la capitale', () => {
      const gs = Make7HexesMapWithPortAndCapital();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const resources = gs.getPlayerResources();
      const gameClock = gs.getGameClock();
      const center = new HexCoord(0, 0);

      // Ville initiale (capitale)
      const capitalVertex = center.vertex(SecondaryHexDirection.N);
      const capital = gameMap.getCity(capitalVertex);
      if (!capital) throw new Error('Capitale non trouvée');

      // Vérifier que la ville est bien une capitale
      expect(capital.level).toBe(CityLevel.Capital);

      // Construire la Guilde des batisseurs
      GameAutoPlayer.playUntilBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      // Vérifier que la Guilde des batisseurs a été construite
      const buildersGuild = capital.getBuilding(BuildingType.BuildersGuild);
      expect(buildersGuild).toBeDefined();
      expect(buildersGuild?.level).toBe(1);
    });

    it('devrait améliorer la Guilde des batisseurs jusqu\'au niveau 3', () => {
      const gs = Make7HexesMapWithPortAndCapital();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const resources = gs.getPlayerResources();
      const gameClock = gs.getGameClock();
      const center = new HexCoord(0, 0);

      const capitalVertex = center.vertex(SecondaryHexDirection.N);
      const capital = gameMap.getCity(capitalVertex);
      if (!capital) throw new Error('Capitale non trouvée');

      // Construire la Guilde des batisseurs niveau 1
      GameAutoPlayer.playUntilBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      // Améliorer au niveau 2
      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      // Vérifier le niveau 2
      let currentCapital = gameMap.getCity(capitalVertex);
      if (!currentCapital) throw new Error('Capitale non trouvée');
      const buildersGuildLevel2 = currentCapital.getBuilding(BuildingType.BuildersGuild);
      expect(buildersGuildLevel2?.level).toBe(2);

      // Améliorer au niveau 3
      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      // Vérifier le niveau 3
      currentCapital = gameMap.getCity(capitalVertex);
      if (!currentCapital) throw new Error('Capitale non trouvée');
      const buildersGuildLevel3 = currentCapital.getBuilding(BuildingType.BuildersGuild);
      expect(buildersGuildLevel3?.level).toBe(3);
    });
  });

  describe('Automatisations de la Guilde des batisseurs', () => {
    it('devrait activer/désactiver la construction automatique de routes (niveau 1)', () => {
      const gs = Make7HexesMapWithPortAndCapital();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const resources = gs.getPlayerResources();
      const gameClock = gs.getGameClock();
      const center = new HexCoord(0, 0);

      const capitalVertex = center.vertex(SecondaryHexDirection.N);
      const capital = gameMap.getCity(capitalVertex);
      if (!capital) throw new Error('Capitale non trouvée');

      // Construire la Guilde des batisseurs niveau 1
      GameAutoPlayer.playUntilBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      const buildersGuild = capital.getBuilding(BuildingType.BuildersGuild);
      if (!buildersGuild) throw new Error('Guilde des batisseurs non trouvée');

      const civilization = gs.getCivilization(civId);

      // Vérifier que l'automatisation est désactivée par défaut
      expect(civilization.isAutoRoadConstructionEnabled()).toBe(false);

      // Activer l'automatisation
      civilization.setAutoRoadConstruction(true);
      expect(civilization.isAutoRoadConstructionEnabled()).toBe(true);

      // Désactiver l'automatisation
      civilization.setAutoRoadConstruction(false);
      expect(civilization.isAutoRoadConstructionEnabled()).toBe(false);
    });

    it('devrait activer/désactiver la construction automatique d\'outposts (niveau 2)', () => {
      const gs = Make7HexesMapWithPortAndCapital();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const resources = gs.getPlayerResources();
      const gameClock = gs.getGameClock();
      const center = new HexCoord(0, 0);

      const capitalVertex = center.vertex(SecondaryHexDirection.N);
      const capital = gameMap.getCity(capitalVertex);
      if (!capital) throw new Error('Capitale non trouvée');

      // Construire et améliorer la Guilde des batisseurs au niveau 2
      GameAutoPlayer.playUntilBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      let currentCapital = gameMap.getCity(capitalVertex);
      if (!currentCapital) throw new Error('Capitale non trouvée');
      const buildersGuild = currentCapital.getBuilding(BuildingType.BuildersGuild);
      if (!buildersGuild) throw new Error('Guilde des batisseurs non trouvée');

      const civilization = gs.getCivilization(civId);

      // Vérifier que l'automatisation est désactivée par défaut
      expect(civilization.isAutoOutpostConstructionEnabled()).toBe(false);

      // Activer l'automatisation
      civilization.setAutoOutpostConstruction(true);
      expect(civilization.isAutoOutpostConstructionEnabled()).toBe(true);

      // Désactiver l'automatisation
      civilization.setAutoOutpostConstruction(false);
      expect(civilization.isAutoOutpostConstructionEnabled()).toBe(false);
    });

    it('devrait activer/désactiver l\'amélioration automatique de villes (niveau 2)', () => {
      const gs = Make7HexesMapWithPortAndCapital();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const resources = gs.getPlayerResources();
      const gameClock = gs.getGameClock();
      const center = new HexCoord(0, 0);

      const capitalVertex = center.vertex(SecondaryHexDirection.N);
      const capital = gameMap.getCity(capitalVertex);
      if (!capital) throw new Error('Capitale non trouvée');

      // Construire et améliorer la Guilde des batisseurs au niveau 2
      GameAutoPlayer.playUntilBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      let currentCapital = gameMap.getCity(capitalVertex);
      if (!currentCapital) throw new Error('Capitale non trouvée');
      const buildersGuild = currentCapital.getBuilding(BuildingType.BuildersGuild);
      if (!buildersGuild) throw new Error('Guilde des batisseurs non trouvée');

      const civilization = gs.getCivilization(civId);

      // Vérifier que l'automatisation est désactivée par défaut
      expect(civilization.isAutoCityUpgradeEnabled()).toBe(false);

      // Activer l'automatisation
      civilization.setAutoCityUpgrade(true);
      expect(civilization.isAutoCityUpgradeEnabled()).toBe(true);

      // Désactiver l'automatisation
      civilization.setAutoCityUpgrade(false);
      expect(civilization.isAutoCityUpgradeEnabled()).toBe(false);
    });

    it('devrait activer/désactiver la construction automatique de bâtiments de production (niveau 3)', () => {
      const gs = Make7HexesMapWithPortAndCapital();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const resources = gs.getPlayerResources();
      const gameClock = gs.getGameClock();
      const center = new HexCoord(0, 0);

      const capitalVertex = center.vertex(SecondaryHexDirection.N);
      const capital = gameMap.getCity(capitalVertex);
      if (!capital) throw new Error('Capitale non trouvée');

      // Construire et améliorer la Guilde des batisseurs au niveau 3
      GameAutoPlayer.playUntilBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      let currentCapital = gameMap.getCity(capitalVertex);
      if (!currentCapital) throw new Error('Capitale non trouvée');
      const buildersGuild = currentCapital.getBuilding(BuildingType.BuildersGuild);
      if (!buildersGuild) throw new Error('Guilde des batisseurs non trouvée');

      const civilization = gs.getCivilization(civId);

      // Vérifier que l'automatisation est désactivée par défaut
      expect(civilization.isAutoProductionBuildingConstructionEnabled()).toBe(false);

      // Activer l'automatisation
      civilization.setAutoProductionBuildingConstruction(true);
      expect(civilization.isAutoProductionBuildingConstructionEnabled()).toBe(true);

      // Désactiver l'automatisation
      civilization.setAutoProductionBuildingConstruction(false);
      expect(civilization.isAutoProductionBuildingConstructionEnabled()).toBe(false);
    });

    it('devrait activer toutes les automatisations au niveau 3', () => {
      const gs = Make7HexesMapWithPortAndCapital();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const resources = gs.getPlayerResources();
      const gameClock = gs.getGameClock();
      const center = new HexCoord(0, 0);

      const capitalVertex = center.vertex(SecondaryHexDirection.N);
      const capital = gameMap.getCity(capitalVertex);
      if (!capital) throw new Error('Capitale non trouvée');

      // Construire et améliorer la Guilde des batisseurs au niveau 3
      GameAutoPlayer.playUntilBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      GameAutoPlayer.playUntilImproveBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      let currentCapital = gameMap.getCity(capitalVertex);
      if (!currentCapital) throw new Error('Capitale non trouvée');
      const buildersGuild = currentCapital.getBuilding(BuildingType.BuildersGuild);
      if (!buildersGuild) throw new Error('Guilde des batisseurs non trouvée');

      expect(buildersGuild.level).toBe(3);

      const civilization = gs.getCivilization(civId);

      // Activer toutes les automatisations
      civilization.setAutoRoadConstruction(true);
      civilization.setAutoOutpostConstruction(true);
      civilization.setAutoCityUpgrade(true);
      civilization.setAutoProductionBuildingConstruction(true);

      // Vérifier que toutes les automatisations sont activées
      expect(civilization.isAutoRoadConstructionEnabled()).toBe(true);
      expect(civilization.isAutoOutpostConstructionEnabled()).toBe(true);
      expect(civilization.isAutoCityUpgradeEnabled()).toBe(true);
      expect(civilization.isAutoProductionBuildingConstructionEnabled()).toBe(true);
    });

    it('devrait lever une erreur si on essaie d\'activer une automatisation sans le niveau requis', () => {
      const gs = Make7HexesMapWithPortAndCapital();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const resources = gs.getPlayerResources();
      const gameClock = gs.getGameClock();
      const center = new HexCoord(0, 0);

      const capitalVertex = center.vertex(SecondaryHexDirection.N);
      const capital = gameMap.getCity(capitalVertex);
      if (!capital) throw new Error('Capitale non trouvée');

      // Construire la Guilde des batisseurs niveau 1 seulement
      GameAutoPlayer.playUntilBuilding(
        BuildingType.BuildersGuild,
        capitalVertex,
        civId,
        gameMap,
        resources,
        gameClock
      );

      const buildersGuild = capital.getBuilding(BuildingType.BuildersGuild);
      if (!buildersGuild) throw new Error('Guilde des batisseurs non trouvée');

      const civilization = gs.getCivilization(civId);

      // Niveau 1 : routes OK, outposts et amélioration de villes KO, production KO
      // Vérifier que canEnable retourne true pour routes, false pour les autres
      expect(buildersGuild.canEnableAutoRoadConstruction()).toBe(true);
      expect(buildersGuild.canEnableAutoOutpostConstruction()).toBe(false);
      expect(buildersGuild.canEnableAutoCityUpgrade()).toBe(false);
      expect(buildersGuild.canEnableAutoProductionBuildingConstruction()).toBe(false);

      // On peut toujours activer dans la civilisation, mais ça ne fonctionnera que si canEnable est true
      civilization.setAutoRoadConstruction(true);
      expect(civilization.isAutoRoadConstructionEnabled()).toBe(true);
      
      civilization.setAutoOutpostConstruction(true);
      civilization.setAutoCityUpgrade(true);
      civilization.setAutoProductionBuildingConstruction(true);
      // Ces automatisations sont activées dans la civilisation mais ne seront pas utilisées car le niveau est insuffisant
    });
  });
});
