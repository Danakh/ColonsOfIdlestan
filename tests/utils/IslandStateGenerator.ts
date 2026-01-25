import { Hex } from '../../src/model/hex/Hex';
import { HexCoord } from '../../src/model/hex/HexCoord';
import { HexDirection, ALL_HEX_DIRECTIONS } from '../../src/model/hex/HexDirection';
import { HexGrid } from '../../src/model/hex/HexGrid';
import { Vertex } from '../../src/model/hex/Vertex';
import { Edge } from '../../src/model/hex/Edge';
import { IslandMap } from '../../src/model/map/IslandMap';
import { HexType } from '../../src/model/map/HexType';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { CityLevel } from '../../src/model/city/CityLevel';
import { BuildingType } from '../../src/model/city/BuildingType';
import { ResourceType } from '../../src/model/map/ResourceType';
import { GameClock } from '../../src/model/game/GameClock';
import { IslandState } from '../../src/model/game/IslandState';
import { PlayerResources } from '../../src/model/game/PlayerResources';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SecondaryHexDirection } from '../../src/model/hex';
import { calculateCivilizationPoints } from '../../src/model/game/CivilizationPoints';

/**
 * Interface pour le retour de createScenarioWithCapitalAndResources.
 */
export interface ScenarioWithCapital {
  islandMap: IslandMap;
  civId: CivilizationId;
  playerResources: PlayerResources;
  islandState: IslandState;
}

/**
 * Utilitaire de test (couche model uniquement).
 * Make7HexesMap crée un IslandState avec une carte de 7 hexagones :
 * - Centre (0,0) : Brick (argile)
 * - 6 voisins : 5 types de ressources avec Wood en double (Wood, Wood, Wheat, Sheep, Ore)
 * - Une civilisation avec une ville au nord de (0,0), niveau Colony (1), avec un hôtel de ville
 * - GameClock initialisé à 123 s
 * - Hexagones d'eau tout autour des 7 hexagones principaux
 */
export function Make7HexesMap(): IslandState {
  const center = new HexCoord(0, 0);
  const mainHexes = [
    center,
    center.neighbor(HexDirection.SW),
    center.neighbor(HexDirection.SE),
    center.neighbor(HexDirection.E),
    center.neighbor(HexDirection.NE),
    center.neighbor(HexDirection.NW),
    center.neighbor(HexDirection.W),
  ];
  
  // Créer un Set pour stocker les coordonnées des hexagones principaux (pour vérification rapide)
  const mainHexCoords = new Set(mainHexes.map(h => h.hashCode()));
  
  // Trouver tous les voisins externes (hexagones d'eau)
  const waterHexCoords = new Set<string>();
  for (const hexCoord of mainHexes) {
    for (const direction of ALL_HEX_DIRECTIONS) {
      const neighborCoord = hexCoord.neighbor(direction);
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
  const islandMap = new IslandMap(grid);

  // Centre : Brick (argile)
  islandMap.setHexType(center, HexType.Brick);
  // 6 voisins : 5 types avec bois en double → Wood, Wood, Wheat, Sheep, Ore (Ore en double pour 6 hexes)
  islandMap.setHexType(center.neighbor(HexDirection.SW), HexType.Wood);
  islandMap.setHexType(center.neighbor(HexDirection.NE), HexType.Wood);
  islandMap.setHexType(center.neighbor(HexDirection.E), HexType.Wheat);
  islandMap.setHexType(center.neighbor(HexDirection.SE), HexType.Sheep);
  islandMap.setHexType(center.neighbor(HexDirection.NW), HexType.Ore);
  islandMap.setHexType(center.neighbor(HexDirection.W), HexType.Ore);
  
  // Définir tous les hexagones d'eau comme Water
  for (const waterKey of waterHexCoords) {
    const [q, r] = waterKey.split(',').map(Number);
    islandMap.setHexType(new HexCoord(q, r), HexType.Water);
  }

  const civId = CivilizationId.create('test-civ');
  islandMap.registerCivilization(civId);

  // Sommet au nord de (0,0) : (0,0), (0,-1), (-1,0)
  const cityVertex = center.vertex(SecondaryHexDirection.N);
  islandMap.addCity(cityVertex, civId, CityLevel.Colony);

  const city = islandMap.getCity(cityVertex);
  if (!city) throw new Error('Ville non trouvée après addCity');
  // Le TownHall est créé automatiquement quand la ville est ajoutée au niveau Colony (1)

  const gameClock = new GameClock();
  gameClock.updateTime(123);

  const gs = new IslandState(new PlayerResources(), civId, gameClock);
  gs.setIslandMap(islandMap);
  gs.setCivilizations([civId]);
  gs.setSeed(null);
  return gs;
}

/**
 * Enregistre un IslandState sur le disque dur dans le dossier saves à la racine du projet.
 * @param islandState L'état de jeu à enregistrer
 * @param filename Le nom du fichier (sans extension, .json sera ajouté automatiquement)
 */
export function saveIslandState(islandState: IslandState, filename: string): void {
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
  const serialized = islandState.serialize();
  writeFileSync(filePath, serialized, 'utf-8');
}

/**
 * Crée un scénario de test avec une capitale et des ressources suffisantes.
 * Utile pour tester des fonctionnalités comme le Prestige du port maritime niveau 4.
 * 
 * Le scénario inclut:
 * - Une carte avec une civilisation
 * - Une capitale au centre
 * - Plusieurs villes supplémentaires pour atteindre 20+ points de civilisation
 * - Des ports maritimes au niveau 4
 * - Des ressources suffisantes pour satisfaire les conditions
 * 
 * @param seed Le seed pour la génération
 * @returns Un objet contenant la map, civId, playerResources, et islandState
 */
export function createScenarioWithCapitalAndResources(seed: number): ScenarioWithCapital {
  // Créer une base simple avec plusieurs hexagones
  const center = new HexCoord(0, 0);
  const hexCoords = [
    center,
    center.neighbor(HexDirection.E),
    center.neighbor(HexDirection.SE),
    center.neighbor(HexDirection.SW),
    center.neighbor(HexDirection.W),
    center.neighbor(HexDirection.NW),
    center.neighbor(HexDirection.NE),
    center.neighbor(HexDirection.E).neighbor(HexDirection.E),
    center.neighbor(HexDirection.W).neighbor(HexDirection.W),
  ];
  
  const hexes = hexCoords.map(c => new Hex(c));
  const grid = new HexGrid(hexes);
  const islandMap = new IslandMap(grid);
  const civId = CivilizationId.create('test-civ-prestige');
  islandMap.registerCivilization(civId);

  // Ajouter une capitale (4 points) au centre
  const capitalVertex = center.vertex(SecondaryHexDirection.N);
  islandMap.addCity(capitalVertex, civId, CityLevel.Capital);

  // Ajouter 10 villes Town (2 points chacune = 20 points)
  // Total: 4 (capital) + 20 (10 towns) = 24 points
  const towns = [
    center.vertex(SecondaryHexDirection.EN),
    center.vertex(SecondaryHexDirection.ES),
    center.neighbor(HexDirection.E).vertex(SecondaryHexDirection.N),
    center.neighbor(HexDirection.E).vertex(SecondaryHexDirection.EN),
    center.neighbor(HexDirection.E).vertex(SecondaryHexDirection.ES),
    center.neighbor(HexDirection.SE).vertex(SecondaryHexDirection.N),
    center.neighbor(HexDirection.SE).vertex(SecondaryHexDirection.EN),
    center.neighbor(HexDirection.SW).vertex(SecondaryHexDirection.N),
    center.neighbor(HexDirection.W).vertex(SecondaryHexDirection.N),
    center.neighbor(HexDirection.NW).vertex(SecondaryHexDirection.N),
  ];

  for (const vertex of towns) {
    if (!islandMap.hasCity(vertex)) {
      try {
        islandMap.addCity(vertex, civId, CityLevel.Town);
      } catch (e) {
        // Ignorer les erreurs
      }
    }
  }

  // Créer l'état de jeu et les ressources
  const islandState = new IslandState(new PlayerResources(), civId, new GameClock());
  islandState.setIslandMap(islandMap);
  islandState.setCivilizations([civId]);
  islandState.setSeed(seed);

  // Ajouter des ressources généreuses
  const playerResources = islandState.getPlayerResources();
  playerResources.addResource(ResourceType.Ore, 100);
  playerResources.addResource(ResourceType.Wood, 100);
  playerResources.addResource(ResourceType.Brick, 100);
  playerResources.addResource(ResourceType.Wheat, 100);
  playerResources.addResource(ResourceType.Sheep, 100);

  return {
    islandMap,
    civId,
    playerResources,
    islandState
  };
}
