import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceHarvestController } from '../../src/controller/ResourceHarvestController';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { Vertex } from '../../src/model/hex/Vertex';
import { GameMap } from '../../src/model/map/GameMap';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { ResourceType } from '../../src/model/map/ResourceType';
import { HexType } from '../../src/model/map/HexType';
import { HexGrid } from '../../src/model/hex/HexGrid';
import { Hex } from '../../src/model/hex/Hex';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { ResourceHarvest } from '../../src/model/game/ResourceHarvest';

describe('ResourceHarvestController', () => {
  let map: GameMap;
  let civId: CivilizationId;
  let resources: PlayerResources;
  let hexCoord: HexCoord;
  let vertex: Vertex;

  beforeEach(() => {
    // Réinitialiser les cooldowns avant chaque test
    // Note: on ne peut pas accéder directement à hexCooldowns car c'est private
    // On va utiliser Date.now() pour simuler le temps qui passe

    const center = new HexCoord(0, 0);
    const north = center.neighbor(HexDirection.N);
    const northeast = center.neighbor(HexDirection.NE);

    const grid = new HexGrid([
      new Hex(center),
      new Hex(north),
      new Hex(northeast),
    ]);
    map = new GameMap(grid);
    civId = CivilizationId.create('civ1');
    map.registerCivilization(civId);

    hexCoord = center;
    vertex = Vertex.create(center, north, northeast);
    map.addCity(vertex, civId);
    map.setHexType(hexCoord, HexType.Wood);

    resources = new PlayerResources();
  });

  describe('harvest', () => {
    it('devrait réussir une récolte valide', () => {
      const result = ResourceHarvestController.harvest(hexCoord, civId, map, resources);

      expect(result.success).toBe(true);
      expect(result.cityVertex).toEqual(vertex);
      expect(result.remainingTimeMs).toBe(1000);
      expect(resources.getResource(ResourceType.Wood)).toBe(1);
    });

    it('devrait échouer si la récolte est trop rapide', () => {
      // Première récolte
      const result1 = ResourceHarvestController.harvest(hexCoord, civId, map, resources);
      expect(result1.success).toBe(true);

      // Deuxième récolte immédiatement après
      const result2 = ResourceHarvestController.harvest(hexCoord, civId, map, resources);
      expect(result2.success).toBe(false);
      expect(result2.remainingTimeMs).toBeGreaterThan(0);
      expect(result2.remainingTimeMs).toBeLessThanOrEqual(1000);
      expect(result2.cityVertex).toBeNull();
      // La ressource ne devrait pas avoir été ajoutée
      expect(resources.getResource(ResourceType.Wood)).toBe(1);
    });

    it('devrait permettre la récolte après le cooldown', async () => {
      // Première récolte
      const result1 = ResourceHarvestController.harvest(hexCoord, civId, map, resources);
      expect(result1.success).toBe(true);

      // Attendre que le cooldown expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Deuxième récolte après le cooldown
      const result2 = ResourceHarvestController.harvest(hexCoord, civId, map, resources);
      expect(result2.success).toBe(true);
      expect(resources.getResource(ResourceType.Wood)).toBe(2);
    });

    it('devrait permettre la récolte sur différents hexagones simultanément', () => {
      // Utiliser north et northeast qui sont déjà adjacents à la ville
      const north = hexCoord.neighbor(HexDirection.N);
      const northeast = hexCoord.neighbor(HexDirection.NE);
      
      // Les deux hexagones sont déjà dans la carte et adjacents à la ville
      map.setHexType(hexCoord, HexType.Wood);
      map.setHexType(north, HexType.Brick);

      // Récolter sur le premier hex
      const result1 = ResourceHarvestController.harvest(hexCoord, civId, map, resources);
      expect(result1.success).toBe(true);

      // Récolter immédiatement sur le deuxième hex (devrait réussir car c'est un hex différent)
      const result2 = ResourceHarvestController.harvest(north, civId, map, resources);
      expect(result2.success).toBe(true);
      expect(resources.getResource(ResourceType.Wood)).toBe(1);
      expect(resources.getResource(ResourceType.Brick)).toBe(1);
    });

    it('devrait échouer si l\'hexagone ne peut pas être récolté', () => {
      // Créer un hexagone non récoltable (pas adjacent à une ville)
      const farHex = new HexCoord(10, 10);
      const grid = new HexGrid([new Hex(hexCoord), new Hex(hexCoord.neighbor(HexDirection.N)), new Hex(hexCoord.neighbor(HexDirection.NE))]);
      const newMap = new GameMap(grid);
      newMap.registerCivilization(civId);
      newMap.addCity(vertex, civId);

      const result = ResourceHarvestController.harvest(farHex, civId, newMap, resources);
      expect(result.success).toBe(false);
      expect(result.remainingTimeMs).toBe(0);
      expect(result.cityVertex).toBeNull();
    });

    it('devrait retourner le bon temps restant', () => {
      // Première récolte
      ResourceHarvestController.harvest(hexCoord, civId, map, resources);

      // Vérifier le temps restant
      const remaining = ResourceHarvestController.getRemainingCooldown(hexCoord);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(1000);
    });

    it('devrait retourner 0 pour un hexagone qui n\'a jamais été récolté', () => {
      // Utiliser un hexagone différent qui n'a jamais été récolté
      const unusedHex = new HexCoord(100, 100);
      const remaining = ResourceHarvestController.getRemainingCooldown(unusedHex);
      expect(remaining).toBe(0);
    });
  });

  describe('getRemainingCooldown', () => {
    it('devrait retourner 0 si l\'hexagone n\'a jamais été récolté', () => {
      // Utiliser un hexagone différent qui n'a jamais été récolté
      const unusedHex = new HexCoord(200, 200);
      const remaining = ResourceHarvestController.getRemainingCooldown(unusedHex);
      expect(remaining).toBe(0);
    });

    it('devrait retourner le temps restant correctement', async () => {
      ResourceHarvestController.harvest(hexCoord, civId, map, resources);
      
      const remaining1 = ResourceHarvestController.getRemainingCooldown(hexCoord);
      expect(remaining1).toBeGreaterThan(0);
      expect(remaining1).toBeLessThanOrEqual(1000);

      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const remaining2 = ResourceHarvestController.getRemainingCooldown(hexCoord);
      expect(remaining2).toBeLessThan(remaining1);
      expect(remaining2).toBeGreaterThan(0);
    });

    it('devrait retourner 0 après expiration du cooldown', async () => {
      ResourceHarvestController.harvest(hexCoord, civId, map, resources);
      
      // Attendre que le cooldown expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const remaining = ResourceHarvestController.getRemainingCooldown(hexCoord);
      expect(remaining).toBe(0);
    });
  });
});
