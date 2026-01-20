import { describe, it, expect, beforeEach } from 'vitest';
import { MainGame } from '../../src/application/MainGame';
import { ResourceHarvest } from '../../src/model/game/ResourceHarvest';
import { ResourceType } from '../../src/model/map/ResourceType';
import { HexType } from '../../src/model/map/HexType';
import { HexCoord } from '../../src/model/hex/HexCoord';

describe('MainGame - Récolte par clic', () => {
  let game: MainGame;

  beforeEach(() => {
    game = new MainGame();
    // Initialiser avec un seed fixe pour des résultats reproductibles
    game.newGame(12345);
  });

  it('devrait récolter les ressources en cliquant sur les hexagones adjacents à une ville', () => {
    const gameMap = game.getGameMap();
    if (!gameMap) {
      throw new Error('La carte de jeu n\'a pas été générée');
    }

    const playerResources = game.getPlayerResources();
    const civId = game.getPlayerCivilizationId();
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();

    // Vérifier que l'inventaire est initialement vide
    expect(playerResources.getResource(ResourceType.Wood)).toBe(0);
    expect(playerResources.getResource(ResourceType.Brick)).toBe(0);
    expect(playerResources.getResource(ResourceType.Wheat)).toBe(0);
    expect(playerResources.getResource(ResourceType.Sheep)).toBe(0);
    expect(playerResources.getResource(ResourceType.Ore)).toBe(0);

    // Compter les hexagones récoltables avant le clic
    const harvestableHexes: HexCoord[] = [];
    const nonHarvestableHexes: HexCoord[] = [];

    for (const hex of allHexes) {
      const canHarvest = ResourceHarvest.canHarvest(hex.coord, gameMap, civId);
      if (canHarvest) {
        harvestableHexes.push(hex.coord);
      } else {
        nonHarvestableHexes.push(hex.coord);
      }
    }

    // Il devrait y avoir au moins quelques hexagones récoltables (adjacents à la ville initiale)
    expect(harvestableHexes.length).toBeGreaterThan(0);

    // Simuler des clics sur tous les hexagones récoltables
    const resourceCountsBefore = new Map<ResourceType, number>();
    resourceCountsBefore.set(ResourceType.Wood, playerResources.getResource(ResourceType.Wood));
    resourceCountsBefore.set(ResourceType.Brick, playerResources.getResource(ResourceType.Brick));
    resourceCountsBefore.set(ResourceType.Wheat, playerResources.getResource(ResourceType.Wheat));
    resourceCountsBefore.set(ResourceType.Sheep, playerResources.getResource(ResourceType.Sheep));
    resourceCountsBefore.set(ResourceType.Ore, playerResources.getResource(ResourceType.Ore));

    // Simuler un clic sur chaque hexagone récoltable
    for (const hexCoord of harvestableHexes) {
      const hexType = gameMap.getHexType(hexCoord);
      if (!hexType) {
        continue;
      }

      // Vérifier que la récolte est possible
      expect(ResourceHarvest.canHarvest(hexCoord, gameMap, civId)).toBe(true);

      // Simuler la récolte
      try {
        ResourceHarvest.harvest(hexCoord, gameMap, civId, playerResources);
      } catch (error) {
        // Si la récolte échoue, c'est une erreur de test
        throw new Error(`La récolte devrait réussir pour l'hexagone ${hexCoord.toString()}: ${error}`);
      }
    }

    // Vérifier que les ressources ont été ajoutées
    const resourceCountsAfter = new Map<ResourceType, number>();
    resourceCountsAfter.set(ResourceType.Wood, playerResources.getResource(ResourceType.Wood));
    resourceCountsAfter.set(ResourceType.Brick, playerResources.getResource(ResourceType.Brick));
    resourceCountsAfter.set(ResourceType.Wheat, playerResources.getResource(ResourceType.Wheat));
    resourceCountsAfter.set(ResourceType.Sheep, playerResources.getResource(ResourceType.Sheep));
    resourceCountsAfter.set(ResourceType.Ore, playerResources.getResource(ResourceType.Ore));

    // Vérifier que le total des ressources a augmenté du nombre d'hexagones récoltables
    const totalBefore = Array.from(resourceCountsBefore.values()).reduce((a, b) => a + b, 0);
    const totalAfter = Array.from(resourceCountsAfter.values()).reduce((a, b) => a + b, 0);
    expect(totalAfter).toBe(totalBefore + harvestableHexes.length);

    // Vérifier que les hexagones non récoltables ne peuvent pas être récoltés
    for (const hexCoord of nonHarvestableHexes) {
      expect(ResourceHarvest.canHarvest(hexCoord, gameMap, civId)).toBe(false);
      
      // Tenter de récolter devrait échouer
      expect(() => {
        ResourceHarvest.harvest(hexCoord, gameMap, civId, playerResources);
      }).toThrow();
    }
  });

  it('devrait identifier correctement les types de ressources récoltées', () => {
    const gameMap = game.getGameMap();
    if (!gameMap) {
      throw new Error('La carte de jeu n\'a pas été générée');
    }

    const playerResources = game.getPlayerResources();
    const civId = game.getPlayerCivilizationId();
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();

    // Compter les hexagones par type de ressource récoltable
    const resourceTypeCounts = new Map<ResourceType, number>();
    resourceTypeCounts.set(ResourceType.Wood, 0);
    resourceTypeCounts.set(ResourceType.Brick, 0);
    resourceTypeCounts.set(ResourceType.Wheat, 0);
    resourceTypeCounts.set(ResourceType.Sheep, 0);
    resourceTypeCounts.set(ResourceType.Ore, 0);

    // Simuler des clics sur tous les hexagones récoltables
    for (const hex of allHexes) {
      if (ResourceHarvest.canHarvest(hex.coord, gameMap, civId)) {
        const hexType = gameMap.getHexType(hex.coord);
        if (!hexType) {
          continue;
        }

        // Obtenir le ResourceType correspondant
        const resourceType = ResourceHarvest.hexTypeToResourceType(hexType);
        if (resourceType) {
          const currentCount = resourceTypeCounts.get(resourceType) || 0;
          resourceTypeCounts.set(resourceType, currentCount + 1);

          // Récolter la ressource
          ResourceHarvest.harvest(hex.coord, gameMap, civId, playerResources);
        }
      }
    }

    // Vérifier que les quantités récoltées correspondent aux types d'hexagones cliqués
    for (const [resourceType, expectedCount] of resourceTypeCounts.entries()) {
      const actualCount = playerResources.getResource(resourceType);
      expect(actualCount).toBe(expectedCount);
    }
  });

  it('devrait récolter du Bois en cliquant sur l\'hexagone Bois adjacent à la ville initiale', () => {
    const gameMap = game.getGameMap();
    if (!gameMap) {
      throw new Error('La carte de jeu n\'a pas été générée');
    }

    const playerResources = game.getPlayerResources();
    const civId = game.getPlayerCivilizationId();
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();

    // Vérifier que l'inventaire est initialement vide
    expect(playerResources.getResource(ResourceType.Wood)).toBe(0);

    // Trouver l'hexagone Bois qui est adjacent à la ville initiale
    let woodHexCoord: HexCoord | null = null;
    for (const hex of allHexes) {
      const hexType = gameMap.getHexType(hex.coord);
      if (hexType === HexType.Wood && ResourceHarvest.canHarvest(hex.coord, gameMap, civId)) {
        woodHexCoord = hex.coord;
        break;
      }
    }

    // Il devrait y avoir un hexagone Bois adjacent à la ville initiale
    expect(woodHexCoord).not.toBeNull();
    if (!woodHexCoord) {
      throw new Error('Aucun hexagone Bois adjacent à la ville initiale trouvé');
    }

    // Vérifier que la récolte est possible
    expect(ResourceHarvest.canHarvest(woodHexCoord, gameMap, civId)).toBe(true);

    // Simuler le clic sur l'hexagone Bois
    ResourceHarvest.harvest(woodHexCoord, gameMap, civId, playerResources);

    // Vérifier que du Bois a été ajouté à l'inventaire
    expect(playerResources.getResource(ResourceType.Wood)).toBe(1);
    expect(playerResources.getResource(ResourceType.Brick)).toBe(0);
    expect(playerResources.getResource(ResourceType.Wheat)).toBe(0);
    expect(playerResources.getResource(ResourceType.Sheep)).toBe(0);
    expect(playerResources.getResource(ResourceType.Ore)).toBe(0);
  });

  it('devrait récolter de l\'Argile en cliquant sur l\'hexagone Argile adjacent à la ville initiale', () => {
    const gameMap = game.getGameMap();
    if (!gameMap) {
      throw new Error('La carte de jeu n\'a pas été générée');
    }

    const playerResources = game.getPlayerResources();
    const civId = game.getPlayerCivilizationId();
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();

    // Vérifier que l'inventaire est initialement vide
    expect(playerResources.getResource(ResourceType.Brick)).toBe(0);

    // Trouver l'hexagone Argile (Brick) qui est adjacent à la ville initiale
    let brickHexCoord: HexCoord | null = null;
    for (const hex of allHexes) {
      const hexType = gameMap.getHexType(hex.coord);
      if (hexType === HexType.Brick && ResourceHarvest.canHarvest(hex.coord, gameMap, civId)) {
        brickHexCoord = hex.coord;
        break;
      }
    }

    // Il devrait y avoir un hexagone Argile adjacent à la ville initiale
    expect(brickHexCoord).not.toBeNull();
    if (!brickHexCoord) {
      throw new Error('Aucun hexagone Argile adjacent à la ville initiale trouvé');
    }

    // Vérifier que la récolte est possible
    expect(ResourceHarvest.canHarvest(brickHexCoord, gameMap, civId)).toBe(true);

    // Simuler le clic sur l'hexagone Argile
    ResourceHarvest.harvest(brickHexCoord, gameMap, civId, playerResources);

    // Vérifier que de l'Argile a été ajoutée à l'inventaire
    expect(playerResources.getResource(ResourceType.Wood)).toBe(0);
    expect(playerResources.getResource(ResourceType.Brick)).toBe(1);
    expect(playerResources.getResource(ResourceType.Wheat)).toBe(0);
    expect(playerResources.getResource(ResourceType.Sheep)).toBe(0);
    expect(playerResources.getResource(ResourceType.Ore)).toBe(0);
  });

  it('ne devrait pas récolter les hexagones Desert ou Water', () => {
    const gameMap = game.getGameMap();
    if (!gameMap) {
      throw new Error('La carte de jeu n\'a pas été générée');
    }

    const playerResources = game.getPlayerResources();
    const civId = game.getPlayerCivilizationId();
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();

    // Vérifier que les hexagones Desert et Water ne sont pas récoltables
    for (const hex of allHexes) {
      const hexType = gameMap.getHexType(hex.coord);
      
      if (hexType === HexType.Desert || hexType === HexType.Water) {
        // Ces hexagones ne devraient pas être récoltables même s'ils sont adjacents à une ville
        // (bien que Desert pourrait être récoltable s'il est adjacent, mais il ne donne pas de ressource)
        const canHarvest = ResourceHarvest.canHarvest(hex.coord, gameMap, civId);
        
        // Même si canHarvest retourne false pour d'autres raisons (non adjacent, non visible),
        // on vérifie que le type de ressource ne peut pas être récolté
        const resourceType = ResourceHarvest.hexTypeToResourceType(hexType);
        expect(resourceType).toBeNull();
        
        if (canHarvest) {
          // Si pour une raison quelconque canHarvest retourne true, la récolte devrait échouer
          expect(() => {
            ResourceHarvest.harvest(hex.coord, gameMap, civId, playerResources);
          }).toThrow();
        }
      }
    }
  });
});
