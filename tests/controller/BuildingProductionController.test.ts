import { describe, it, expect, beforeEach } from 'vitest';
import { BuildingProductionController } from '../../src/controller/BuildingProductionController';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { Vertex } from '../../src/model/hex/Vertex';
import { GameMap } from '../../src/model/map/GameMap';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { HexType } from '../../src/model/map/HexType';
import { HexGrid } from '../../src/model/hex/HexGrid';
import { Hex } from '../../src/model/hex/Hex';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { City } from '../../src/model/city/City';
import { BuildingType } from '../../src/model/city/BuildingType';
import { CityLevel } from '../../src/model/city/CityLevel';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { GameClock } from '../../src/model/game/GameClock';
import { ResourceType } from '../../src/model/map/ResourceType';

describe('BuildingProductionController', () => {
  describe('getProductionInterval', () => {
    it('devrait retourner 1.0 seconde pour un bâtiment niveau 1', () => {
      const interval = BuildingProductionController.getProductionInterval(1);
      expect(interval).toBe(1.0);
    });

    it('devrait retourner 0.8 seconde pour un bâtiment niveau 2 (1.0 * 0.8)', () => {
      const interval = BuildingProductionController.getProductionInterval(2);
      expect(interval).toBeCloseTo(0.8, 5);
    });

    it('devrait retourner 0.64 seconde pour un bâtiment niveau 3 (1.0 * 0.8^2)', () => {
      const interval = BuildingProductionController.getProductionInterval(3);
      expect(interval).toBeCloseTo(0.64, 5);
    });

    it('devrait retourner 0.512 seconde pour un bâtiment niveau 4 (1.0 * 0.8^3)', () => {
      const interval = BuildingProductionController.getProductionInterval(4);
      expect(interval).toBeCloseTo(0.512, 5);
    });

    it('devrait retourner environ 0.107 seconde pour un bâtiment niveau 10 (1.0 * 0.8^9)', () => {
      const interval = BuildingProductionController.getProductionInterval(10);
      expect(interval).toBeCloseTo(Math.pow(0.8, 9), 5);
    });
  });


  describe('isHexAutoHarvested', () => {
    let map: GameMap;
    let civId: CivilizationId;
    let otherCivId: CivilizationId;
    let hexCoord: HexCoord;
    let vertex: Vertex;

    beforeEach(() => {
      // Créer une grille avec plusieurs hexagones
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const northwest = center.neighbor(HexDirection.NW);
      const south = center.neighbor(HexDirection.S);
      const southeast = center.neighbor(HexDirection.SE);
      const southwest = center.neighbor(HexDirection.SW);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(northwest),
        new Hex(south),
        new Hex(southeast),
        new Hex(southwest),
      ]);
      
      map = new GameMap(grid);
      civId = CivilizationId.create('civ1');
      otherCivId = CivilizationId.create('civ2');
      map.registerCivilization(civId);
      map.registerCivilization(otherCivId);

      hexCoord = center;
      vertex = Vertex.create(center, north, northeast);
    });

    it('devrait retourner false si l\'hex n\'a pas de type', () => {
      // Pas de type assigné à l'hex
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(false);
    });

    it('devrait retourner false si aucune ville n\'est adjacente', () => {
      map.setHexType(hexCoord, HexType.Wood);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(false);
    });

    it('devrait retourner false si la ville adjacente n\'appartient pas à la civilisation', () => {
      map.setHexType(hexCoord, HexType.Wood);
      map.addCity(vertex, otherCivId);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(false);
    });

    it('devrait retourner false si la ville n\'a pas de bâtiment de production de ressources', () => {
      map.setHexType(hexCoord, HexType.Wood);
      map.addCity(vertex, civId);
      
      // La ville n'a pas de bâtiments
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(false);
    });

    it('devrait retourner false si la ville a un bâtiment qui ne récolte pas ce type d\'hex', () => {
      map.setHexType(hexCoord, HexType.Wood);
      map.addCity(vertex, civId, CityLevel.Colony);
      const city = map.getCity(vertex)!;
      
      // Ajouter un bâtiment qui récolte un autre type (ex: Mine pour Ore)
      city.addBuilding(BuildingType.Mine);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(false);
    });

    it('devrait retourner false si la ville a un bâtiment non-producteur (ex: Seaport)', () => {
      map.setHexType(hexCoord, HexType.Wood);
      map.setHexType(vertex.getHexes()[0], HexType.Water); // Seaport exige un hex eau adjacent
      map.addCity(vertex, civId, CityLevel.Town); // Seaport demande niveau Town (2)
      const city = map.getCity(vertex)!;
      
      // Ajouter un bâtiment non-producteur
      city.addBuilding(BuildingType.Seaport);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(false);
    });

    it('devrait retourner true si la ville a un bâtiment Sawmill adjacent à un hex Wood', () => {
      map.setHexType(hexCoord, HexType.Wood);
      map.addCity(vertex, civId, CityLevel.Colony);
      const city = map.getCity(vertex)!;
      
      // Ajouter un Sawmill (qui récolte Wood)
      city.addBuilding(BuildingType.Sawmill);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(true);
    });

    it('devrait retourner true si la ville a un bâtiment Brickworks adjacent à un hex Brick', () => {
      map.setHexType(hexCoord, HexType.Brick);
      map.addCity(vertex, civId, CityLevel.Colony);
      const city = map.getCity(vertex)!;
      
      // Ajouter un Brickworks (qui récolte Brick)
      city.addBuilding(BuildingType.Brickworks);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(true);
    });

    it('devrait retourner true si la ville a un bâtiment Mill adjacent à un hex Wheat', () => {
      map.setHexType(hexCoord, HexType.Wheat);
      map.addCity(vertex, civId, CityLevel.Colony);
      const city = map.getCity(vertex)!;
      
      // Ajouter un Mill (qui récolte Wheat)
      city.addBuilding(BuildingType.Mill);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(true);
    });

    it('devrait retourner true si la ville a un bâtiment Sheepfold adjacent à un hex Sheep', () => {
      map.setHexType(hexCoord, HexType.Sheep);
      map.addCity(vertex, civId, CityLevel.Colony);
      const city = map.getCity(vertex)!;
      
      // Ajouter un Sheepfold (qui récolte Sheep)
      city.addBuilding(BuildingType.Sheepfold);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(true);
    });

    it('devrait retourner true si la ville a un bâtiment Mine adjacent à un hex Ore', () => {
      map.setHexType(hexCoord, HexType.Ore);
      map.addCity(vertex, civId, CityLevel.Colony);
      const city = map.getCity(vertex)!;
      
      // Ajouter un Mine (qui récolte Ore)
      city.addBuilding(BuildingType.Mine);
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(true);
    });

    it('devrait retourner false si l\'hex n\'est pas adjacent au vertex de la ville', () => {
      // Créer une ville sur un vertex différent
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const cityVertex = Vertex.create(center, north, northeast);
      
      // Créer un hex loin de la ville
      const south = center.neighbor(HexDirection.S);
      const distantHex = south.neighbor(HexDirection.S);
      
      // Ajouter l'hex distant à la grille
      const grid = map.getGrid();
      const allHexes = [
        ...Array.from(grid.getAllHexes()),
        new Hex(distantHex),
      ];
      const newGrid = new HexGrid(allHexes);
      // Note: On ne peut pas modifier la grille directement, donc on recrée la map
      // Pour ce test, utilisons un hex qui existe déjà mais qui n'est pas adjacent
      const southeast = center.neighbor(HexDirection.SE);
      map.setHexType(southeast, HexType.Wood);
      
      map.addCity(cityVertex, civId, CityLevel.Colony);
      const city = map.getCity(cityVertex)!;
      city.addBuilding(BuildingType.Sawmill);
      
      // L'hex southeast n'est pas adjacent au vertex cityVertex (qui utilise center, north, northeast)
      const result = BuildingProductionController.isHexAutoHarvested(southeast, civId, map);
      expect(result).toBe(false);
      
    });

    it('devrait retourner true même si la ville a plusieurs bâtiments dont un qui correspond', () => {
      map.setHexType(hexCoord, HexType.Wood);
      map.setHexType(vertex.getHexes()[0], HexType.Water); // Seaport exige un hex eau adjacent
      map.addCity(vertex, civId, CityLevel.Town); // Seaport demande niveau Town (2)
      const city = map.getCity(vertex)!;
      
      // Ajouter plusieurs bâtiments
      city.addBuilding(BuildingType.Sawmill); // Récolte Wood - correspond !
      city.addBuilding(BuildingType.Mine);    // Récolte Ore - ne correspond pas
      city.addBuilding(BuildingType.Seaport); // Ne récolte rien
      
      const result = BuildingProductionController.isHexAutoHarvested(hexCoord, civId, map);
      expect(result).toBe(true);
    });

    it('devrait fonctionner avec des villes sur différents vertices adjacents au même hex', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const southeast = center.neighbor(HexDirection.SE);
      
      map.setHexType(center, HexType.Wood);
      
      // Créer deux vertices différents qui partagent l'hex center
      const vertex1 = Vertex.create(center, north, northeast);
      // Pour vertex2, utilisons center avec deux autres hexagones adjacents valides
      const vertex2 = Vertex.create(center, northeast, southeast);
      
      map.addCity(vertex1, civId, CityLevel.Colony);
      const city1 = map.getCity(vertex1)!;
      city1.addBuilding(BuildingType.Sawmill);
      
      // Vérifier que l'hex center est récolté par city1
      const result1 = BuildingProductionController.isHexAutoHarvested(center, civId, map);
      expect(result1).toBe(true);
      
      // Créer une autre ville sur vertex2 (même civilisation)
      map.addCity(vertex2, civId, CityLevel.Colony);
      const city2 = map.getCity(vertex2)!;
      city2.addBuilding(BuildingType.Sawmill);
      
      // L'hex devrait toujours être récolté (par au moins une ville)
      const result2 = BuildingProductionController.isHexAutoHarvested(center, civId, map);
      expect(result2).toBe(true);
    });
  });

  describe('processAutomaticProduction - récolte par deux villes', () => {
    let map: GameMap;
    let civId: CivilizationId;
    let resources: PlayerResources;
    let gameClock: GameClock;
    let center: HexCoord;
    let vertex1: Vertex;
    let vertex2: Vertex;

    beforeEach(() => {
      // Créer une grille avec un hex central et deux villes adjacentes
      center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const southeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(southeast),
      ]);
      
      map = new GameMap(grid);
      civId = CivilizationId.create('civ1');
      map.registerCivilization(civId);

      // Créer deux vertices différents qui partagent l'hex center
      vertex1 = Vertex.create(center, north, northeast);
      vertex2 = Vertex.create(center, northeast, southeast);

      // Ajouter les deux villes
      map.addCity(vertex1, civId, CityLevel.Colony);
      map.addCity(vertex2, civId, CityLevel.Colony);

      // Ajouter des bâtiments Sawmill dans les deux villes
      const city1 = map.getCity(vertex1)!;
      const city2 = map.getCity(vertex2)!;
      city1.addBuilding(BuildingType.Sawmill);
      city2.addBuilding(BuildingType.Sawmill);

      // Définir le type d'hex central comme Wood
      map.setHexType(center, HexType.Wood);

      resources = new PlayerResources();
      gameClock = new GameClock();
    });

    it('devrait permettre à deux villes de récolter automatiquement le même hex', () => {
      // Initialiser les temps de production pour les deux villes
      const city1 = map.getCity(vertex1)!;
      const city2 = map.getCity(vertex2)!;
      
      // Définir un temps de production dans le passé pour que les deux villes soient prêtes
      gameClock.updateTime(2.0);
      city1.getBuilding(BuildingType.Sawmill)!.setProductionTimeSeconds(0.5);
      city2.getBuilding(BuildingType.Sawmill)!.setProductionTimeSeconds(0.5);

      // Traiter la production automatique
      const results = BuildingProductionController.processAutomaticProduction(
        civId,
        map,
        resources,
        gameClock
      );

      // Les deux villes devraient avoir récolté le même hex
      expect(results.length).toBe(2);
      
      // Vérifier que les deux résultats concernent le même hex
      expect(results[0].hexCoord.equals(center)).toBe(true);
      expect(results[1].hexCoord.equals(center)).toBe(true);
      
      // Vérifier que les deux villes ont produit
      const cityVertices = results.map(r => r.cityVertex);
      expect(cityVertices.some(v => v.equals(vertex1))).toBe(true);
      expect(cityVertices.some(v => v.equals(vertex2))).toBe(true);
      
      // Vérifier que les ressources ont été ajoutées (2 récoltes = 2 bois)
      expect(resources.getResource(ResourceType.Wood)).toBe(2);
    });

    it('devrait produire plus vite avec un bâtiment de niveau supérieur', () => {
      const city1 = map.getCity(vertex1)!;
      const city2 = map.getCity(vertex2)!;
      
      // Améliorer le bâtiment au niveau 2 (intervalle = 0.8s au lieu de 1.0s)
      city1.upgradeBuilding(BuildingType.Sawmill);
      expect(city1.getBuildingLevel(BuildingType.Sawmill)).toBe(2);
      
      // Initialiser le temps de production pour les deux villes
      gameClock.updateTime(0.0);
      city1.getBuilding(BuildingType.Sawmill)!.setProductionTimeSeconds(0.0);
      // City2 reste au niveau 1 (intervalle 1.0s), donc ne produira pas à t=0.8s
      city2.getBuilding(BuildingType.Sawmill)!.setProductionTimeSeconds(0.0);
      
      // À t=0.5s, aucun bâtiment ne produit encore
      gameClock.updateTime(0.5);
      let results = BuildingProductionController.processAutomaticProduction(
        civId,
        map,
        resources,
        gameClock
      );
      expect(results.length).toBe(0);
      
      // À t=0.8s, le bâtiment niveau 2 devrait produire (city1 uniquement)
      gameClock.updateTime(0.8);
      results = BuildingProductionController.processAutomaticProduction(
        civId,
        map,
        resources,
        gameClock
      );
      expect(results.length).toBe(1);
      expect(results[0].cityVertex.equals(vertex1)).toBe(true);
      expect(resources.getResource(ResourceType.Wood)).toBe(1);
    });

    it('devrait produire encore plus vite avec un bâtiment de niveau 3', () => {
      const city1 = map.getCity(vertex1)!;
      const city2 = map.getCity(vertex2)!;
      
      // Améliorer le bâtiment au niveau 3 (intervalle = 0.64s)
      city1.upgradeBuilding(BuildingType.Sawmill); // niveau 2
      city1.upgradeBuilding(BuildingType.Sawmill); // niveau 3
      expect(city1.getBuildingLevel(BuildingType.Sawmill)).toBe(3);
      
      // Initialiser le temps de production pour les deux villes
      gameClock.updateTime(0.0);
      city1.getBuilding(BuildingType.Sawmill)!.setProductionTimeSeconds(0.0);
      // City2 reste au niveau 1 (intervalle 1.0s), donc ne produira pas à t=0.65s
      city2.getBuilding(BuildingType.Sawmill)!.setProductionTimeSeconds(0.0);
      
      // À t=0.65s (> 0.64s), le bâtiment niveau 3 devrait produire (city1 uniquement)
      gameClock.updateTime(0.65);
      const results = BuildingProductionController.processAutomaticProduction(
        civId,
        map,
        resources,
        gameClock
      );
      expect(results.length).toBe(1);
      expect(results[0].cityVertex.equals(vertex1)).toBe(true);
      expect(resources.getResource(ResourceType.Wood)).toBe(1);
    });

    it('devrait permettre à deux villes de récolter le même hex à des moments différents', () => {
      const city1 = map.getCity(vertex1)!;
      const city2 = map.getCity(vertex2)!;
      
      // Première ville prête à t=1.0
      gameClock.updateTime(1.0);
      city1.getBuilding(BuildingType.Sawmill)!.setProductionTimeSeconds(0.0);
      city2.getBuilding(BuildingType.Sawmill)!.setProductionTimeSeconds(0.5); // Pas encore prête

      // Première récolte
      let results = BuildingProductionController.processAutomaticProduction(
        civId,
        map,
        resources,
        gameClock
      );

      expect(results.length).toBe(1);
      expect(results[0].cityVertex.equals(vertex1)).toBe(true);
      expect(resources.getResource(ResourceType.Wood)).toBe(1);

      // Deuxième ville prête à t=1.5
      gameClock.updateTime(1.5);
      results = BuildingProductionController.processAutomaticProduction(
        civId,
        map,
        resources,
        gameClock
      );

      expect(results.length).toBe(1);
      expect(results[0].cityVertex.equals(vertex2)).toBe(true);
      expect(resources.getResource(ResourceType.Wood)).toBe(2);
    });
  });
});
