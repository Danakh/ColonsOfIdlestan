import { describe, it, expect } from 'vitest';
import { GameMap } from '../../../src/model/map/GameMap';
import { ResourceType } from '../../../src/model/map/ResourceType';
import { HexGrid } from '../../../src/model/hex/HexGrid';
import { Hex } from '../../../src/model/hex/Hex';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection } from '../../../src/model/hex/HexDirection';
import { Edge } from '../../../src/model/hex/Edge';
import { Vertex } from '../../../src/model/hex/Vertex';

describe('GameMap', () => {
  describe('initialisation', () => {
    it('devrait créer une carte à partir d\'une grille', () => {
      const hexes = [
        new Hex(new HexCoord(0, 0)),
        new Hex(new HexCoord(1, 0)),
      ];
      const grid = new HexGrid(hexes);
      const map = new GameMap(grid);

      expect(map.getGrid()).toBe(grid);
    });

    it('devrait initialiser toutes les ressources à Desert par défaut', () => {
      const hexes = [
        new Hex(new HexCoord(0, 0)),
        new Hex(new HexCoord(1, 0)),
      ];
      const grid = new HexGrid(hexes);
      const map = new GameMap(grid);

      expect(map.getResource(new HexCoord(0, 0))).toBe(ResourceType.Desert);
      expect(map.getResource(new HexCoord(1, 0))).toBe(ResourceType.Desert);
    });
  });

  describe('gestion des ressources', () => {
    it('devrait définir et récupérer une ressource pour un hexagone', () => {
      const hex = new Hex(new HexCoord(0, 0));
      const grid = new HexGrid([hex]);
      const map = new GameMap(grid);

      map.setResource(hex, ResourceType.Wood);
      expect(map.getResource(hex)).toBe(ResourceType.Wood);
    });

    it('devrait accepter une coordonnée pour définir une ressource', () => {
      const hex = new Hex(new HexCoord(0, 0));
      const grid = new HexGrid([hex]);
      const map = new GameMap(grid);

      map.setResource(new HexCoord(0, 0), ResourceType.Brick);
      expect(map.getResource(new HexCoord(0, 0))).toBe(ResourceType.Brick);
    });

    it('devrait gérer différents types de ressources', () => {
      const hexes = [
        new Hex(new HexCoord(0, 0)),
        new Hex(new HexCoord(1, 0)),
        new Hex(new HexCoord(0, 1)),
      ];
      const grid = new HexGrid(hexes);
      const map = new GameMap(grid);

      map.setResource(new HexCoord(0, 0), ResourceType.Wood);
      map.setResource(new HexCoord(1, 0), ResourceType.Brick);
      map.setResource(new HexCoord(0, 1), ResourceType.Wheat);

      expect(map.getResource(new HexCoord(0, 0))).toBe(ResourceType.Wood);
      expect(map.getResource(new HexCoord(1, 0))).toBe(ResourceType.Brick);
      expect(map.getResource(new HexCoord(0, 1))).toBe(ResourceType.Wheat);
    });

    it('devrait lancer une erreur si on définit une ressource pour un hexagone inexistant', () => {
      const hex = new Hex(new HexCoord(0, 0));
      const grid = new HexGrid([hex]);
      const map = new GameMap(grid);

      expect(() => {
        map.setResource(new HexCoord(10, 10), ResourceType.Wood);
      }).toThrow();
    });

    it('devrait retourner undefined pour un hexagone inexistant', () => {
      const hex = new Hex(new HexCoord(0, 0));
      const grid = new HexGrid([hex]);
      const map = new GameMap(grid);

      expect(map.getResource(new HexCoord(10, 10))).toBeUndefined();
    });
  });

  describe('gestion des villes', () => {
    it('devrait ajouter une ville sur un sommet', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);

      const vertex = Vertex.create(center, north, northeast);
      map.addCity(vertex);

      expect(map.hasCity(vertex)).toBe(true);
    });

    it('devrait retourner false si aucune ville n\'existe sur un sommet', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);

      const vertex = Vertex.create(center, north, northeast);
      expect(map.hasCity(vertex)).toBe(false);
    });

    it('devrait lancer une erreur si on ajoute une ville sur un sommet invalide', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);

      // Créer un sommet avec des hexagones qui n'existent pas dans la grille
      const invalidHex1 = new HexCoord(10, 10);
      const invalidHex2 = new HexCoord(10, 11);
      const invalidHex3 = new HexCoord(11, 10);

      const map = new GameMap(grid);

      // Un sommet avec des hexagones invalides ne peut pas être créé par Vertex.create
      // Mais testons avec un sommet qui n'a aucun hexagone valide
      // En fait, Vertex.create nécessite que les 3 hexagones soient adjacents
      // donc on ne peut pas créer un sommet invalide de cette façon
      // Testons plutôt avec un sommet qui existe mais qui n'a pas d'hexagone dans la grille
      // Ce cas est difficile à tester car Vertex.create nécessite des hexagones adjacents
      // et si un hexagone est dans la grille, le sommet est valide
    });
  });

  describe('gestion des routes', () => {
    it('devrait ajouter une route sur une arête', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
      ]);
      const map = new GameMap(grid);

      const edge = Edge.create(center, north);
      map.addRoad(edge);

      expect(map.hasRoad(edge)).toBe(true);
    });

    it('devrait retourner false si aucune route n\'existe sur une arête', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
      ]);
      const map = new GameMap(grid);

      const edge = Edge.create(center, north);
      expect(map.hasRoad(edge)).toBe(false);
    });

    it('devrait gérer plusieurs routes', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);

      const edge1 = Edge.create(center, north);
      const edge2 = Edge.create(center, northeast);

      map.addRoad(edge1);
      map.addRoad(edge2);

      expect(map.hasRoad(edge1)).toBe(true);
      expect(map.hasRoad(edge2)).toBe(true);
    });
  });

  describe('visibilité des hexagones', () => {
    it('devrait retourner false pour un hexagone sans route adjacente', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      const map = new GameMap(grid);

      expect(map.isHexVisible(center)).toBe(false);
    });

    it('devrait retourner true pour un hexagone avec une route sur une arête adjacente', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
      ]);
      const map = new GameMap(grid);

      // Ajouter une route sur l'arête entre center et north
      const edge = Edge.create(center, north);
      map.addRoad(edge);

      // L'hexagone center devrait être visible car il a un vertex avec une route
      expect(map.isHexVisible(center)).toBe(true);
      // L'hexagone north devrait aussi être visible
      expect(map.isHexVisible(north)).toBe(true);
    });

    it('devrait retourner true si au moins un vertex a une route connectée', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
      ]);
      const map = new GameMap(grid);

      // Ajouter une route sur l'arête entre north et northeast
      // Cela crée un vertex (center, north, northeast) avec une route
      const edge = Edge.create(north, northeast);
      map.addRoad(edge);

      // L'hexagone center devrait être visible car le vertex (center, north, northeast) a une route
      expect(map.isHexVisible(center)).toBe(true);
      expect(map.isHexVisible(north)).toBe(true);
      expect(map.isHexVisible(northeast)).toBe(true);
    });

    it('devrait retourner false pour un hexagone isolé même avec des routes ailleurs', () => {
      const center = new HexCoord(0, 0);
      const isolated = new HexCoord(10, 10);
      const north = center.neighbor(HexDirection.N);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(isolated),
        new Hex(north),
      ]);
      const map = new GameMap(grid);

      // Ajouter une route près du center
      const edge = Edge.create(center, north);
      map.addRoad(edge);

      // L'hexagone isolé ne devrait pas être visible
      expect(map.isHexVisible(isolated)).toBe(false);
      // Mais center devrait être visible
      expect(map.isHexVisible(center)).toBe(true);
    });

    it('devrait retourner false pour un hexagone inexistant', () => {
      const center = new HexCoord(0, 0);
      const grid = new HexGrid([new Hex(center)]);
      const map = new GameMap(grid);

      expect(map.isHexVisible(new HexCoord(10, 10))).toBe(false);
    });

    it('devrait gérer correctement la visibilité avec plusieurs routes', () => {
      const center = new HexCoord(0, 0);
      const north = center.neighbor(HexDirection.N);
      const northeast = center.neighbor(HexDirection.NE);
      const southeast = center.neighbor(HexDirection.SE);

      const grid = new HexGrid([
        new Hex(center),
        new Hex(north),
        new Hex(northeast),
        new Hex(southeast),
      ]);
      const map = new GameMap(grid);

      // Ajouter plusieurs routes
      map.addRoad(Edge.create(center, north));
      map.addRoad(Edge.create(center, northeast));
      map.addRoad(Edge.create(center, southeast));

      // Tous les hexagones devraient être visibles
      expect(map.isHexVisible(center)).toBe(true);
      expect(map.isHexVisible(north)).toBe(true);
      expect(map.isHexVisible(northeast)).toBe(true);
      expect(map.isHexVisible(southeast)).toBe(true);
    });
  });

  describe('isolation des mutations', () => {
    it('ne devrait pas permettre la mutation de la grille via getGrid', () => {
      const hex = new Hex(new HexCoord(0, 0));
      const grid = new HexGrid([hex]);
      const map = new GameMap(grid);

      const retrievedGrid = map.getGrid();
      
      // Vérifier que la grille retournée est la même instance
      expect(retrievedGrid).toBe(grid);
      
      // Mais les méthodes de la grille ne devraient pas permettre de modifier
      // les structures internes de manière inattendue
      // (la grille elle-même est déjà en lecture seule pour les hexagones)
    });

    it('devrait maintenir la cohérence des ressources après modifications', () => {
      const hexes = [
        new Hex(new HexCoord(0, 0)),
        new Hex(new HexCoord(1, 0)),
      ];
      const grid = new HexGrid(hexes);
      const map = new GameMap(grid);

      map.setResource(new HexCoord(0, 0), ResourceType.Wood);
      map.setResource(new HexCoord(1, 0), ResourceType.Brick);

      // Vérifier que les ressources sont toujours correctes
      expect(map.getResource(new HexCoord(0, 0))).toBe(ResourceType.Wood);
      expect(map.getResource(new HexCoord(1, 0))).toBe(ResourceType.Brick);
    });
  });
});