import { describe, it, expect } from 'vitest';
import { Make7HexesMap } from '../../utils/GameStateGenerator';
import { HexCoord } from '../../../src/model/hex/HexCoord';
import { HexDirection, ALL_HEX_DIRECTIONS } from '../../../src/model/hex/HexDirection';
import { SecondaryHexDirection } from '../../../src/model/hex/SecondaryHexDirection';
import { HexType } from '../../../src/model/map/HexType';
import { CityLevel } from '../../../src/model/city/CityLevel';
import { BuildingType } from '../../../src/model/city/BuildingType';
import { GameState } from '../../../src/model/game/GameState';

/** Vérifie qu'un GameState correspond à la structure Map7Hexes (7 hex principaux + hexagones d'eau tout autour, centre Brick, 6 voisins, 1 ville Colony + TownHall, GameClock à 123s). */
function assertMap7Hexes(gs: GameState): void {
  const map = gs.getGameMap();
  expect(map).not.toBeNull();
  if (!map) throw new Error('Carte nulle');

  const center = new HexCoord(0, 0);
  const civilizationId = gs.getPlayerCivilizationId();

  // Il devrait y avoir 19 hexagones au total : 7 principaux + 12 d'eau autour
  expect(map.getGrid().size()).toBe(19);
  expect(map.getHexType(center)).toBe(HexType.Brick);

  const neighborCoords = [
    center.neighbor(HexDirection.SW),
    center.neighbor(HexDirection.SE),
    center.neighbor(HexDirection.E),
    center.neighbor(HexDirection.NE),
    center.neighbor(HexDirection.NW),
    center.neighbor(HexDirection.W),
  ];
  const types = neighborCoords.map((c) => map.getHexType(c));
  expect(types.filter((t) => t === HexType.Wood).length).toBe(2);
  expect(types).toContain(HexType.Wheat);
  expect(types).toContain(HexType.Sheep);
  expect(types).toContain(HexType.Ore);

  // Vérifier que les hexagones d'eau sont présents autour des hexagones principaux
  // Les hexagones d'eau sont les voisins externes des 7 hexagones principaux
  const allMainHexes = [center, ...neighborCoords];
  const waterHexes: HexCoord[] = [];
  for (const hexCoord of allMainHexes) {
    for (const direction of ALL_HEX_DIRECTIONS) {
      const neighborCoord = hexCoord.neighbor(direction);
      const isMainHex = allMainHexes.some((h) => h.equals(neighborCoord));
      if (!isMainHex && map.getGrid().hasHex(neighborCoord)) {
        waterHexes.push(neighborCoord);
      }
    }
  }
  // Vérifier qu'il y a des hexagones d'eau et qu'ils sont bien de type Water
  expect(waterHexes.length).toBeGreaterThan(0);
  for (const waterHex of waterHexes) {
    expect(map.getHexType(waterHex)).toBe(HexType.Water);
  }

  expect(map.isCivilizationRegistered(civilizationId)).toBe(true);

  const cityVertex = center.vertex(SecondaryHexDirection.N);
  expect(map.hasCity(cityVertex)).toBe(true);
  expect(map.getCityCount()).toBe(1);

  const city = map.getCity(cityVertex)!;
  expect(city.level).toBe(CityLevel.Colony);
  expect(city.hasBuilding(BuildingType.TownHall)).toBe(true);

  expect(gs.getGameClock().getCurrentTime()).toBe(123);
}

describe('GameStateGenerator', () => {
  describe('Make7HexesMap', () => {
    it('crée une carte de 7 hexagones principaux avec hexagones d\'eau tout autour, (0,0) central en Brick, 6 voisins (5 ressources, bois en double), une civ, ville niveau 1 avec hôtel de ville, GameClock à 123s', () => {
      const gs = Make7HexesMap();
      assertMap7Hexes(gs);
    });

    it('sauve la carte Map7Hexes, la charge et vérifie que la map est identique', () => {
      const gs = Make7HexesMap();
      const serialized = gs.serialize();
      const loaded = GameState.deserialize(serialized);
      assertMap7Hexes(loaded);
    });
  });
});

