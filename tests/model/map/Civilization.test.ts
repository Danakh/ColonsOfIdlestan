import { describe, it, expect } from 'vitest';
import { Civilization } from '../../../src/model/map/Civilization';
import { CivilizationId } from '../../../src/model/map/CivilizationId';
import { Make7HexesMap } from '../../utils/GameStateGenerator';
import { Edge } from '../../../src/model/hex/Edge';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection } from '../../../src/model/hex/HexDirection';
import { CityLevel } from '../../../src/model/city/CityLevel';
import { Vertex } from '../../../src/model/hex/Vertex';

describe('Civilization', () => {
  describe('méthodes utilitaires avec GameMap', () => {
    it('devrait retourner le nombre de routes correct', () => {
      const gs = Make7HexesMap();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const civilization = new Civilization(civId);

      // Initialement, il n'y a pas de routes dans Make7HexesMap
      expect(civilization.getRoadCount(gameMap)).toBe(0);

      // Ajouter quelques routes
      const center = new HexCoord(0, 0);
      const seHex = center.neighbor(HexDirection.E);
      const sHex = center.neighbor(HexDirection.NE);

      const road1 = Edge.create(center, seHex);
      gameMap.addRoad(road1, civId);

      expect(civilization.getRoadCount(gameMap)).toBe(1);

      const road2 = Edge.create(seHex, sHex);
      gameMap.addRoad(road2, civId);

      expect(civilization.getRoadCount(gameMap)).toBe(2);
    });

    it('devrait retourner le nombre de villes correct', () => {
      const gs = Make7HexesMap();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const civilization = new Civilization(civId);

      // Make7HexesMap crée une ville initiale
      expect(civilization.getCityCount(gameMap)).toBe(1);

      // Ajouter une deuxième ville
      const center = new HexCoord(0, 0);
      const seHex = center.neighbor(HexDirection.E);
      const sHex = center.neighbor(HexDirection.NE);

      // Construire une route pour permettre la construction d'un outpost
      const road1 = Edge.create(center, seHex);
      gameMap.addRoad(road1, civId);
      const road2 = Edge.create(seHex, sHex);
      gameMap.addRoad(road2, civId);

      // Trouver un vertex valide pour créer une ville
      const grid = gameMap.getGrid();
      const seVertices = grid.getVerticesForHex(seHex);
      let newCityVertex: Vertex | undefined;
      for (const vertex of seVertices) {
        if (!gameMap.hasCity(vertex)) {
          newCityVertex = vertex;
          break;
        }
      }

      if (newCityVertex) {
        gameMap.addCity(newCityVertex, civId, CityLevel.Outpost);
        expect(civilization.getCityCount(gameMap)).toBe(2);
      }
    });

    it('devrait retourner la somme des niveaux de villes correcte', () => {
      const gs = Make7HexesMap();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const civilization = new Civilization(civId);

      // Make7HexesMap crée une ville au niveau Colony (1)
      expect(civilization.getTotalCityLevel(gameMap)).toBe(1);

      // Ajouter une ville Outpost (niveau 0)
      const center = new HexCoord(0, 0);
      const seHex = center.neighbor(HexDirection.E);
      const sHex = center.neighbor(HexDirection.NE);

      // Construire des routes pour permettre la construction d'un outpost
      const road1 = Edge.create(center, seHex);
      gameMap.addRoad(road1, civId);
      const road2 = Edge.create(seHex, sHex);
      gameMap.addRoad(road2, civId);

      // Trouver un vertex valide pour créer une ville
      const grid = gameMap.getGrid();
      const seVertices = grid.getVerticesForHex(seHex);
      let newCityVertex: Vertex | undefined;
      for (const vertex of seVertices) {
        if (!gameMap.hasCity(vertex)) {
          newCityVertex = vertex;
          break;
        }
      }

      if (newCityVertex) {
        gameMap.addCity(newCityVertex, civId, CityLevel.Outpost);
        // Total devrait être 1 (Colony) + 0 (Outpost) = 1
        expect(civilization.getTotalCityLevel(gameMap)).toBe(1);
      }
    });

    it('devrait retourner le nombre de bâtiments correct', () => {
      const gs = Make7HexesMap();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const civilization = new Civilization(civId);

      // Make7HexesMap crée une ville Colony (niveau 1) avec un TownHall niveau 1
      // Donc 1 bâtiment
      expect(civilization.getBuildingCount(gameMap)).toBe(1);

      // Ajouter une ville Outpost (niveau 0, pas de bâtiment)
      const center = new HexCoord(0, 0);
      const seHex = center.neighbor(HexDirection.E);
      const sHex = center.neighbor(HexDirection.NE);

      // Construire des routes pour permettre la construction d'un outpost
      const road1 = Edge.create(center, seHex);
      gameMap.addRoad(road1, civId);
      const road2 = Edge.create(seHex, sHex);
      gameMap.addRoad(road2, civId);

      // Trouver un vertex valide pour créer une ville
      const grid = gameMap.getGrid();
      const seVertices = grid.getVerticesForHex(seHex);
      let newCityVertex: Vertex | undefined;
      for (const vertex of seVertices) {
        if (!gameMap.hasCity(vertex)) {
          newCityVertex = vertex;
          break;
        }
      }

      if (newCityVertex) {
        gameMap.addCity(newCityVertex, civId, CityLevel.Outpost);
        // Un Outpost n'a pas de bâtiment par défaut
        // Donc toujours 1 bâtiment (le TownHall de la première ville)
        expect(civilization.getBuildingCount(gameMap)).toBe(1);
      }
    });

    it('devrait retourner 0 pour toutes les statistiques si la civilisation n\'a rien', () => {
      const gs = Make7HexesMap();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      // Créer une nouvelle civilisation qui n'a rien sur la carte
      const newCivId = CivilizationId.create('new-civ');
      gameMap.registerCivilization(newCivId);
      const newCivilization = new Civilization(newCivId);

      expect(newCivilization.getRoadCount(gameMap)).toBe(0);
      expect(newCivilization.getCityCount(gameMap)).toBe(0);
      expect(newCivilization.getTotalCityLevel(gameMap)).toBe(0);
      expect(newCivilization.getBuildingCount(gameMap)).toBe(0);
    });

    it('devrait compter correctement plusieurs villes avec différents niveaux', () => {
      const gs = Make7HexesMap();
      const gameMap = gs.getGameMap();
      if (!gameMap) throw new Error('Carte non trouvée');

      const civId = gs.getPlayerCivilizationId();
      const civilization = new Civilization(civId);

      const center = new HexCoord(0, 0);
      const seHex = center.neighbor(HexDirection.E);
      const sHex = center.neighbor(HexDirection.NE);

      // Construire des routes
      const road1 = Edge.create(center, seHex);
      gameMap.addRoad(road1, civId);
      const road2 = Edge.create(seHex, sHex);
      gameMap.addRoad(road2, civId);

      // Trouver des vertices valides pour créer des villes
      const grid = gameMap.getGrid();
      const seVertices = grid.getVerticesForHex(seHex);
      const sVertices = grid.getVerticesForHex(sHex);

      let city1Vertex: Vertex | undefined;
      let city2Vertex: Vertex | undefined;

      for (const vertex of seVertices) {
        if (!gameMap.hasCity(vertex)) {
          city1Vertex = vertex;
          break;
        }
      }

      for (const vertex of sVertices) {
        if (!gameMap.hasCity(vertex)) {
          city2Vertex = vertex;
          break;
        }
      }

      if (city1Vertex && city2Vertex) {
        // Ajouter une ville Outpost (niveau 0)
        gameMap.addCity(city1Vertex, civId, CityLevel.Outpost);
        // Ajouter une ville Town (niveau 2)
        gameMap.addCity(city2Vertex, civId, CityLevel.Town);

        // Vérifier les statistiques
        // 1 ville initiale (Colony niveau 1) + 1 Outpost (niveau 0) + 1 Town (niveau 2) = 3 villes
        expect(civilization.getCityCount(gameMap)).toBe(3);
        // Total niveau: 1 + 0 + 2 = 3
        expect(civilization.getTotalCityLevel(gameMap)).toBe(3);
        // Bâtiments: 1 (TownHall de la première ville) + 0 (Outpost) + 1 (TownHall de Town) = 2
        expect(civilization.getBuildingCount(gameMap)).toBe(2);
      }
    });
  });
});

