import { describe, it, expect } from 'vitest';
import { Make7HexesMap } from '../../utils/GameStateGenerator';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection } from '../../../src/model/hex/HexDirection';
import { Vertex } from '../../../src/model/hex/Vertex';
import { HexType } from '../../../src/model/map/HexType';
import { CityLevel } from '../../../src/model/city/CityLevel';
import { BuildingType } from '../../../src/model/city/BuildingType';
import { GameState } from '../../../src/model/game/GameState';
import { PlayerResources } from '../../../src/model/game/PlayerResources';

describe('GameStateGenerator', () => {
  describe('Make7HexesMap', () => {
    it('crée une carte de 7 hexagones avec (0,0) central en Brick, 6 voisins (5 ressources, bois en double), une civ, ville niveau 1 avec hôtel de ville, GameClock à 123s', () => {
      const { gameMap, gameClock, civilizationId } = Make7HexesMap();
      const center = new HexCoord(0, 0);

      // 7 hexagones
      expect(gameMap.getGrid().size()).toBe(7);

        // Hex (0,0) central produit de l'argile (Brick)
      expect(gameMap.getHexType(center)).toBe(HexType.Brick);

      // Les 6 voisins : 5 types avec bois en double
      const neighborCoords = [
        center.neighbor(HexDirection.N),
        center.neighbor(HexDirection.NE),
        center.neighbor(HexDirection.SE),
        center.neighbor(HexDirection.S),
        center.neighbor(HexDirection.SW),
        center.neighbor(HexDirection.NW),
      ];
      const types = neighborCoords.map((c) => gameMap.getHexType(c));
      expect(types.filter((t) => t === HexType.Wood).length).toBe(2);
      expect(types).toContain(HexType.Wheat);
      expect(types).toContain(HexType.Sheep);
      expect(types).toContain(HexType.Ore);

      // Civilisation enregistrée
      expect(gameMap.isCivilizationRegistered(civilizationId)).toBe(true);

      // Ville au nord de (0,0) : sommet (0,0), (0,-1), (-1,0)
      const cityVertex = Vertex.create(
        center,
        center.neighbor(HexDirection.N),
        center.neighbor(HexDirection.NW)
      );
      expect(gameMap.hasCity(cityVertex)).toBe(true);

      const city = gameMap.getCity(cityVertex)!;
      expect(city.level).toBe(CityLevel.Colony); // niveau 1
      expect(city.hasBuilding(BuildingType.TownHall)).toBe(true);

      // GameClock à 123 s
      expect(gameClock.getCurrentTime()).toBe(123);
    });

    it('sauve la carte Map7Hexes, la charge et vérifie que la map est identique', () => {
      const { gameMap, gameClock, civilizationId } = Make7HexesMap();
      const gs = new GameState(new PlayerResources(), civilizationId, gameClock);
      gs.setGameMap(gameMap);
      gs.setCivilizations([civilizationId]);
      gs.setSeed(null);

      const serialized = gs.serialize();
      const loaded = GameState.deserialize(serialized);
      const map2 = loaded.getGameMap();
      expect(map2).not.toBeNull();
      if (!map2) throw new Error('Carte chargée nulle');

      const center = new HexCoord(0, 0);
      expect(map2.getGrid().size()).toBe(7);
      expect(map2.getHexType(center)).toBe(HexType.Brick);
      expect(map2.getHexType(center.neighbor(HexDirection.N))).toBe(HexType.Wood);
      expect(map2.getHexType(center.neighbor(HexDirection.NE))).toBe(HexType.Wood);
      expect(map2.getHexType(center.neighbor(HexDirection.SE))).toBe(HexType.Wheat);
      expect(map2.getHexType(center.neighbor(HexDirection.S))).toBe(HexType.Sheep);
      expect(map2.getHexType(center.neighbor(HexDirection.SW))).toBe(HexType.Ore);
      expect(map2.getHexType(center.neighbor(HexDirection.NW))).toBe(HexType.Ore);

      expect(map2.getCityCount()).toBe(1);
      const cityVertex = Vertex.create(
        center,
        center.neighbor(HexDirection.N),
        center.neighbor(HexDirection.NW)
      );
      expect(map2.hasCity(cityVertex)).toBe(true);
      const city = map2.getCity(cityVertex)!;
      expect(city.level).toBe(CityLevel.Colony);
      expect(city.hasBuilding(BuildingType.TownHall)).toBe(true);

      expect(loaded.getGameClock().getCurrentTime()).toBe(123);
    });
  });
});
