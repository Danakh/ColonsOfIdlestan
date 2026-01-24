import { Hex } from '../../src/model/hex/Hex';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { MainHexDirection, ALL_MAIN_DIRECTIONS } from '../../src/model/hex/MainHexDirection';
import { HexGrid } from '../../src/model/hex/HexGrid';
import { Vertex } from '../../src/model/hex/Vertex';
import { Edge } from '../../src/model/hex/Edge';
import { GameMap } from '../../src/model/map/GameMap';
import { HexType } from '../../src/model/map/HexType';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { CityLevel } from '../../src/model/city/CityLevel';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceType } from '../../src/model/map/ResourceType';
import { GameClock } from '../../src/model/game/GameClock';
import { GameState } from '../../src/model/game/GameState';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SecondaryHexDirection } from '../../src/model/hex';

/**
 * Utilitaire de test (couche model uniquement).
 * Make7HexesMap crée un GameState avec une carte de 7 hexagones :
 * - Centre (0,0) : Brick (argile)
 * - 6 voisins : 5 types de ressources avec Wood en double (Wood, Wood, Wheat, Sheep, Ore)
 * - Une civilisation avec une ville au nord de (0,0), niveau Colony (1), avec un hôtel de ville
 * - GameClock initialisé à 123 s
 * - Hexagones d'eau tout autour des 7 hexagones principaux
 */
export function Make7HexesMap(): GameState {
  const center = new HexCoord(0, 0);
  const mainHexes = [
    center,
    center.neighborMain(MainHexDirection.SW),
    center.neighborMain(MainHexDirection.SE),
    center.neighborMain(MainHexDirection.E),
    center.neighborMain(MainHexDirection.NE),
    center.neighborMain(MainHexDirection.NW),
    center.neighborMain(MainHexDirection.W),
  ];
  
  // Créer un Set pour stocker les coordonnées des hexagones principaux (pour vérification rapide)
  const mainHexCoords = new Set(mainHexes.map(h => h.hashCode()));
  
  // Trouver tous les voisins externes (hexagones d'eau)
  const waterHexCoords = new Set<string>();
  for (const hexCoord of mainHexes) {
    for (const direction of ALL_MAIN_DIRECTIONS) {
      const neighborCoord = hexCoord.neighborMain(direction);
      const neighborKey = neighborCoord.hashCode();
      // Ajouter seulement si ce n'est pas un hexagone principal
      if (!mainHexCoords.has(neighborKey)) {
        waterHexCoords.add(neighborKey);
      }
    }
  }
  
  // Créer tous les hexagones (principaux + eau)
  const hexes = [
    ...mainHexes.map(coord => new Hex(coord)),
    ...Array.from(waterHexCoords).map(key => {
      const [q, r] = key.split(',').map(Number);
      return new Hex(new HexCoord(q, r));
    }),
  ];
  
  const grid = new HexGrid(hexes);
  const gameMap = new GameMap(grid);

  // Centre : Brick (argile)
  gameMap.setHexType(center, HexType.Brick);
  // 6 voisins : 5 types avec bois en double → Wood, Wood, Wheat, Sheep, Ore (Ore en double pour 6 hexes)
  gameMap.setHexType(center.neighborMain(MainHexDirection.SW), HexType.Wood);
  gameMap.setHexType(center.neighborMain(MainHexDirection.NE), HexType.Wood);
  gameMap.setHexType(center.neighborMain(MainHexDirection.E), HexType.Wheat);
  gameMap.setHexType(center.neighborMain(MainHexDirection.SE), HexType.Sheep);
  gameMap.setHexType(center.neighborMain(MainHexDirection.NW), HexType.Ore);
  gameMap.setHexType(center.neighborMain(MainHexDirection.W), HexType.Ore);
  
  // Définir tous les hexagones d'eau comme Water
  for (const waterKey of waterHexCoords) {
    const [q, r] = waterKey.split(',').map(Number);
    gameMap.setHexType(new HexCoord(q, r), HexType.Water);
  }

  const civId = CivilizationId.create('test-civ');
  gameMap.registerCivilization(civId);

  // Sommet au nord de (0,0) : (0,0), (0,-1), (-1,0)
  const cityVertex = center.vertex(SecondaryHexDirection.N);
  gameMap.addCity(cityVertex, civId, CityLevel.Colony);

  const city = gameMap.getCity(cityVertex);
  if (!city) throw new Error('Ville non trouvée après addCity');
  // Le TownHall est créé automatiquement quand la ville est ajoutée au niveau Colony (1)

  const gameClock = new GameClock();
  gameClock.updateTime(123);

  const gs = new GameState(new PlayerResources(), civId, gameClock);
  gs.setGameMap(gameMap);
  gs.setCivilizations([civId]);
  gs.setSeed(null);
  return gs;
}

/**
 * Enregistre un GameState sur le disque dur dans le dossier saves à la racine du projet.
 * @param gameState L'état de jeu à enregistrer
 * @param filename Le nom du fichier (sans extension, .json sera ajouté automatiquement)
 */
export function saveGameState(gameState: GameState, filename: string): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Remonter depuis tests/utils vers la racine du projet
  const projectRoot = join(__dirname, '..', '..');
  const savesDir = join(projectRoot, 'saves');
  
  // Créer le dossier saves s'il n'existe pas
  mkdirSync(savesDir, { recursive: true });
  
  // Créer le chemin complet du fichier
  const filePath = join(savesDir, `${filename}.json`);
  
  // Sérialiser et enregistrer
  const serialized = gameState.serialize();
  writeFileSync(filePath, serialized, 'utf-8');
}
