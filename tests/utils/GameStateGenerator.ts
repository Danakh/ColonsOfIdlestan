import { Hex } from '../../src/model/hex/Hex';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection } from '../../src/model/hex/HexDirection';
import { HexGrid } from '../../src/model/hex/HexGrid';
import { Vertex } from '../../src/model/hex/Vertex';
import { GameMap } from '../../src/model/map/GameMap';
import { HexType } from '../../src/model/map/HexType';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { CityLevel } from '../../src/model/city/CityLevel';
import { BuildingType } from '../../src/model/city/BuildingType';
import { GameClock } from '../../src/model/game/GameClock';
import { GameState } from '../../src/model/game/GameState';
import { PlayerResources } from '../../src/model/game/PlayerResources';

/**
 * Utilitaire de test (couche model uniquement).
 * Make7HexesMap crée un GameState avec une carte de 7 hexagones :
 * - Centre (0,0) : Brick (argile)
 * - 6 voisins : 5 types de ressources avec Wood en double (Wood, Wood, Wheat, Sheep, Ore)
 * - Une civilisation avec une ville au nord de (0,0), niveau Colony (1), avec un hôtel de ville
 * - GameClock initialisé à 123 s
 */
export function Make7HexesMap(): GameState {
  const center = new HexCoord(0, 0);
  const hexes = [
    new Hex(center),
    new Hex(center.neighbor(HexDirection.N)),
    new Hex(center.neighbor(HexDirection.NE)),
    new Hex(center.neighbor(HexDirection.SE)),
    new Hex(center.neighbor(HexDirection.S)),
    new Hex(center.neighbor(HexDirection.SW)),
    new Hex(center.neighbor(HexDirection.NW)),
  ];
  const grid = new HexGrid(hexes);
  const gameMap = new GameMap(grid);

  // Centre : Brick (argile)
  gameMap.setHexType(center, HexType.Brick);
  // 6 voisins : 5 types avec bois en double → Wood, Wood, Wheat, Sheep, Ore (Ore en double pour 6 hexes)
  gameMap.setHexType(center.neighbor(HexDirection.N), HexType.Wood);
  gameMap.setHexType(center.neighbor(HexDirection.NE), HexType.Wood);
  gameMap.setHexType(center.neighbor(HexDirection.SE), HexType.Wheat);
  gameMap.setHexType(center.neighbor(HexDirection.S), HexType.Sheep);
  gameMap.setHexType(center.neighbor(HexDirection.SW), HexType.Ore);
  gameMap.setHexType(center.neighbor(HexDirection.NW), HexType.Ore);

  const civId = CivilizationId.create('test-civ');
  gameMap.registerCivilization(civId);

  // Sommet au nord de (0,0) : (0,0), (0,-1), (-1,0)
  const cityVertex = Vertex.create(
    center,
    center.neighbor(HexDirection.N),
    center.neighbor(HexDirection.NW)
  );
  gameMap.addCity(cityVertex, civId, CityLevel.Colony);

  const city = gameMap.getCity(cityVertex);
  if (!city) throw new Error('Ville non trouvée après addCity');
  city.addBuilding(BuildingType.TownHall);

  const gameClock = new GameClock();
  gameClock.updateTime(123);

  const gs = new GameState(new PlayerResources(), civId, gameClock);
  gs.setGameMap(gameMap);
  gs.setCivilizations([civId]);
  gs.setSeed(null);
  return gs;
}
