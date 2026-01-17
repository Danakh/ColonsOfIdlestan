import { HexGrid } from '../model/hex/HexGrid';
import { Hex } from '../model/hex/Hex';
import { HexCoord } from '../model/hex/HexCoord';
import { HexDirection, ALL_DIRECTIONS } from '../model/hex/HexDirection';
import { Vertex } from '../model/hex/Vertex';
import { GameMap } from '../model/map/GameMap';
import { HexType } from '../model/map/HexType';
import { CivilizationId } from '../model/map/CivilizationId';
import { SeededRNG } from './util/SeededRNG';

/**
 * Configuration pour la génération d'une carte.
 */
export interface MapGeneratorConfig {
  /** Distribution des hexagones : nombre d'hexagones par type d'hexagone */
  resourceDistribution: Map<HexType, number>;
  /** Liste des civilisations (au moins une requise) */
  civilizations: CivilizationId[];
  /** Seed pour la génération déterministe */
  seed: number;
}

/**
 * Génère une GameMap selon des règles configurables.
 * 
 * Cette classe appartient à la couche Controller et agit comme une factory
 * pour créer des GameMap avec une structure et des ressources prédéterminées.
 */
export class MapGenerator {
  /**
   * Génère une nouvelle GameMap selon la configuration fournie.
   * 
   * @param config - Configuration de génération
   * @returns Une GameMap complètement initialisée avec ressources assignées
   * @throws Error si la configuration est invalide
   */
  generate(config: MapGeneratorConfig): GameMap {
    this.validateConfig(config);

    const rng = new SeededRNG(config.seed);
    
    // Générer d'abord les hexagones terrestres (avec identification de Bois et Argile)
    const { hexes: terrestrialHexes, woodCoord, brickCoord } = this.generateTerrestrialHexes(config, rng);
    
    // Ajouter la couche d'eau autour des hexagones terrestres
    const allHexes = this.addWaterLayer(terrestrialHexes);
    
    // Créer la grille complète avec tous les hexagones (terrestres + eau)
    const hexGrid = new HexGrid(allHexes);
    const gameMap = new GameMap(hexGrid);

    // Enregistrer les civilisations
    for (const civId of config.civilizations) {
      gameMap.registerCivilization(civId);
    }

    // Assigner les ressources aux hexagones terrestres
    // Les deux premiers (Bois et Argile) doivent être assignés en premier
    this.assignResources(gameMap, terrestrialHexes, config, rng, woodCoord, brickCoord);

    // Assigner Water à tous les hexagones d'eau
    this.assignWaterResources(gameMap, terrestrialHexes);

    // Ajouter la ville initiale sur le vertex bois-argile-eau pour la première civilisation
    if (config.civilizations.length > 0) {
      this.addInitialCity(gameMap, woodCoord, brickCoord, config.civilizations[0]);
    }

    return gameMap;
  }

  /**
   * Valide la configuration de génération.
   * @throws Error si la configuration est invalide
   */
  private validateConfig(config: MapGeneratorConfig): void {
    if (!config.civilizations || config.civilizations.length === 0) {
      throw new Error('Au moins une civilisation est requise.');
    }

    // Calculer le nombre total d'hexagones requis
    let totalHexes = 0;
    for (const count of config.resourceDistribution.values()) {
      if (count < 0) {
        throw new Error('La distribution de ressources ne peut pas contenir de valeurs négatives.');
      }
      totalHexes += count;
    }

    if (totalHexes === 0) {
      throw new Error('Au moins un hexagone est requis (distribution de ressources vide).');
    }

    // Vérifier que le seed est valide (n'importe quel nombre est valide)
    if (typeof config.seed !== 'number' || !isFinite(config.seed)) {
      throw new Error('Le seed doit être un nombre fini.');
    }
  }

  /**
   * Génère uniquement les hexagones terrestres selon les règles de placement.
   * - Les 2 premiers hexagones sont placés adjacents
   * - Chaque hexagone suivant doit être adjacent à au moins 2 hexagones déjà placés
   * - Après génération, trouve un vertex au bord (2 hexagones + 1 emplacement eau) pour Bois et Argile
   */
  private generateTerrestrialHexes(config: MapGeneratorConfig, rng: SeededRNG): { hexes: Hex[], woodCoord: HexCoord, brickCoord: HexCoord } {
    const totalHexes = this.calculateTotalHexes(config.resourceDistribution);
    const placedCoords = new Set<string>();
    const hexes: Hex[] = [];

    // Étape 1: Placer les 2 premiers hexagones adjacents
    const firstCoord = new HexCoord(0, 0);
    const secondCoord = firstCoord.neighbor(HexDirection.N);

    hexes.push(new Hex(firstCoord));
    hexes.push(new Hex(secondCoord));
    placedCoords.add(firstCoord.hashCode());
    placedCoords.add(secondCoord.hashCode());

    // Étape 2: Placer les hexagones restants
    while (hexes.length < totalHexes) {
      const candidateCoord = this.findValidPlacement(placedCoords, rng);

      if (!candidateCoord) {
        // Si aucun placement valide n'est trouvé, cela peut arriver si la distribution
        // demande plus d'hexagones que possible avec les règles données
        throw new Error(
          `Impossible de placer tous les hexagones requis. ` +
          `Placés: ${hexes.length}/${totalHexes}. ` +
          `Vérifiez que la distribution de ressources est raisonnable.`
        );
      }

      hexes.push(new Hex(candidateCoord));
      placedCoords.add(candidateCoord.hashCode());
    }

    // Étape 3: Trouver un vertex au bord pour placer Bois et Argile
    // Un vertex au bord = 2 hexagones terrestres adjacents qui ont un voisin commun
    // qui n'est pas encore dans les hexagones terrestres (sera l'eau)
    const borderVertex = this.findBorderVertex(placedCoords, rng);
    if (!borderVertex) {
      throw new Error('Impossible de trouver un vertex au bord pour placer Bois et Argile.');
    }

    const { woodCoord, brickCoord } = borderVertex;

    return { hexes, woodCoord, brickCoord };
  }

  /**
   * Trouve un vertex au bord de la carte terrestre.
   * Un vertex au bord est formé par 2 hexagones terrestres adjacents
   * qui ont un voisin commun qui n'est pas terrestre (sera l'eau).
   */
  private findBorderVertex(terrestrialCoords: Set<string>, rng: SeededRNG): { woodCoord: HexCoord, brickCoord: HexCoord } | null {
    const borderCandidates: Array<{ woodCoord: HexCoord, brickCoord: HexCoord }> = [];

    // Parcourir tous les hexagones terrestres
    for (const coordHash of terrestrialCoords) {
      const [q, r] = coordHash.split(',').map(Number);
      const coord1 = new HexCoord(q, r);

      // Vérifier tous les voisins de ce hexagone
      for (const direction of ALL_DIRECTIONS) {
        const coord2 = coord1.neighbor(direction);
        
        // Si le voisin est aussi terrestre, on a une paire adjacente
        if (terrestrialCoords.has(coord2.hashCode())) {
          // Vérifier si cette paire a un voisin commun qui n'est pas terrestre
          const neighbors1 = coord1.neighbors();
          const neighbors2 = coord2.neighbors();
          
          // Trouver les voisins communs
          for (const n1 of neighbors1) {
            if (neighbors2.some(n2 => n2.equals(n1))) {
              // Ce voisin commun existe pour les deux hexagones
              // Si ce voisin n'est pas terrestre, c'est un vertex au bord
              if (!terrestrialCoords.has(n1.hashCode())) {
                // On a trouvé un vertex au bord : coord1, coord2, et n1 (qui sera l'eau)
                borderCandidates.push({
                  woodCoord: coord1,
                  brickCoord: coord2,
                });
                break; // Pas besoin de continuer pour cette paire
              }
            }
          }
        }
      }
    }

    // Choisir un candidat aléatoire
    if (borderCandidates.length === 0) {
      return null;
    }

    return rng.pick(borderCandidates) || null;
  }

  /**
   * Trouve une coordonnée valide pour le prochain hexagone.
   * Un placement est valide si le nouvel hexagone est adjacent à au moins 2 hexagones déjà placés.
   */
  private findValidPlacement(placedCoords: Set<string>, rng: SeededRNG): HexCoord | null {
    // Collecter tous les candidats (voisins des hexagones placés)
    const candidateMap = new Map<string, HexCoord>();

    // Pour chaque hexagone déjà placé, examiner ses voisins
    for (const coordHash of placedCoords) {
      const [q, r] = coordHash.split(',').map(Number);
      const coord = new HexCoord(q, r);

      for (const direction of ALL_DIRECTIONS) {
        const neighbor = coord.neighbor(direction);
        const neighborHash = neighbor.hashCode();

        // Si ce voisin n'est pas déjà placé, l'ajouter aux candidats
        if (!placedCoords.has(neighborHash)) {
          candidateMap.set(neighborHash, neighbor);
        }
      }
    }

    // Filtrer les candidats qui sont adjacents à au moins 2 hexagones déjà placés
    const validCandidates: HexCoord[] = [];
    for (const candidate of candidateMap.values()) {
      // Compter combien de voisins de ce candidat sont déjà placés
      let adjacentCount = 0;
      for (const dir of ALL_DIRECTIONS) {
        const neighbor = candidate.neighbor(dir);
        if (placedCoords.has(neighbor.hashCode())) {
          adjacentCount++;
        }
      }

      // Un hexagone doit être adjacent à au moins 2 hexagones déjà placés
      if (adjacentCount >= 2) {
        validCandidates.push(candidate);
      }
    }

    // Choisir un candidat aléatoire
    return rng.pick(validCandidates) || null;
  }

  /**
   * Calcule le nombre total d'hexagones requis.
   */
  private calculateTotalHexes(resourceDistribution: Map<HexType, number>): number {
    let total = 0;
    for (const count of resourceDistribution.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Ajoute une couche d'hexagones d'eau autour des hexagones terrestres.
   * Retourne tous les hexagones (terrestres + eau).
   */
  private addWaterLayer(terrestrialHexes: Hex[]): Hex[] {
    const terrestrialCoords = new Set<string>();
    const waterCoords = new Set<string>();

    // Marquer tous les hexagones terrestres
    for (const hex of terrestrialHexes) {
      terrestrialCoords.add(hex.coord.hashCode());
    }

    // Trouver tous les hexagones d'eau nécessaires (voisins des hexagones terrestres)
    for (const hex of terrestrialHexes) {
      for (const direction of ALL_DIRECTIONS) {
        const neighborCoord = hex.coord.neighbor(direction);
        const neighborHash = neighborCoord.hashCode();

        // Si ce voisin n'est pas terrestre, c'est un hexagone d'eau
        if (!terrestrialCoords.has(neighborHash) && !waterCoords.has(neighborHash)) {
          waterCoords.add(neighborHash);
        }
      }
    }

    // Créer tous les hexagones (terrestres + eau)
    const allHexes: Hex[] = [...terrestrialHexes];

    // Ajouter tous les hexagones d'eau
    for (const coordHash of waterCoords) {
      const [q, r] = coordHash.split(',').map(Number);
      const waterCoord = new HexCoord(q, r);
      allHexes.push(new Hex(waterCoord));
    }

    return allHexes;
  }

  /**
   * Assignë les ressources aux hexagones terrestres selon la distribution.
   * Exclut les hexagones d'eau.
   * Les deux premiers hexagones (Bois et Argile) sont assignés en premier.
   */
  private assignResources(
    gameMap: GameMap,
    terrestrialHexes: Hex[],
    config: MapGeneratorConfig,
    rng: SeededRNG,
    woodCoord: HexCoord,
    brickCoord: HexCoord
  ): void {
    // Créer une liste de tous les types d'hexagones à assigner (sans l'eau)
    const hexTypesToAssign: HexType[] = [];
    for (const [hexType, count] of config.resourceDistribution.entries()) {
      // Ignorer l'eau dans la distribution (elle sera ajoutée séparément)
      if (hexType === HexType.Water) {
        continue;
      }
      for (let i = 0; i < count; i++) {
        hexTypesToAssign.push(hexType);
      }
    }

    // Séparer les hexagones Bois et Argile pour les placer en premier
    const woodIndex = hexTypesToAssign.indexOf(HexType.Wood);
    const brickIndex = hexTypesToAssign.indexOf(HexType.Brick);
    
    // Retirer Bois et Argile de la liste (un exemplaire de chaque)
    if (woodIndex !== -1) {
      hexTypesToAssign.splice(woodIndex, 1);
    }
    if (brickIndex !== -1 && brickIndex !== woodIndex) {
      // Ajuster l'index si Wood a été retiré avant
      const adjustedBrickIndex = hexTypesToAssign.indexOf(HexType.Brick);
      if (adjustedBrickIndex !== -1) {
        hexTypesToAssign.splice(adjustedBrickIndex, 1);
      }
    }

    // Mélanger la liste pour un placement aléatoire
    rng.shuffle(hexTypesToAssign);

    // Assigner Bois et Argile aux deux premiers hexagones
    gameMap.setResource(woodCoord, HexType.Wood);
    gameMap.setResource(brickCoord, HexType.Brick);

    // Filtrer les hexagones terrestres (exclure Bois et Argile)
    const remainingHexes = terrestrialHexes.filter(
      hex => !hex.coord.equals(woodCoord) && !hex.coord.equals(brickCoord)
    );

    // Mélanger les hexagones restants
    const shuffledHexes = [...remainingHexes];
    rng.shuffle(shuffledHexes);

    // Assigner chaque type d'hexagone restant à un hexagone
    for (let i = 0; i < hexTypesToAssign.length && i < shuffledHexes.length; i++) {
      const hex = shuffledHexes[i];
      const hexType = hexTypesToAssign[i];
      gameMap.setResource(hex.coord, hexType);
    }
  }

  /**
   * Assignë Water à tous les hexagones d'eau de la carte.
   */
  private assignWaterResources(gameMap: GameMap, terrestrialHexes: Hex[]): void {
    const grid = gameMap.getGrid();
    const terrestrialCoords = new Set<string>();

    // Marquer tous les hexagones terrestres
    for (const hex of terrestrialHexes) {
      terrestrialCoords.add(hex.coord.hashCode());
    }

    // Parcourir tous les hexagones de la grille et assigner Water à ceux qui ne sont pas terrestres
    for (const hex of grid.getAllHexes()) {
      if (!terrestrialCoords.has(hex.coord.hashCode())) {
        gameMap.setResource(hex.coord, HexType.Water);
      }
    }
  }

  /**
   * Ajoute la ville initiale sur le vertex bois-argile-eau.
   */
  private addInitialCity(
    gameMap: GameMap,
    woodCoord: HexCoord,
    brickCoord: HexCoord,
    civId: CivilizationId
  ): void {
    const grid = gameMap.getGrid();

    // Trouver l'hexagone d'eau qui forme un vertex avec Bois et Argile
    // Un vertex est formé par trois hexagones mutuellement adjacents
    // Nous devons trouver un hexagone d'eau adjacent à la fois à Bois et Argile
    
    // Les deux hexagones sont adjacents (brickCoord est en N de woodCoord)
    // Pour former un vertex, il faut un troisième hexagone adjacent aux deux
    
    // Méthode 1: Chercher parmi tous les vertices du hexagone Bois
    // Cela garantit que le vertex retourné correspond à celui utilisé dans la grille
    const woodVertices = grid.getVerticesForHex(woodCoord);
    for (const vertex of woodVertices) {
      const hexes = vertex.getHexes();
      // Vérifier si ce vertex contient woodCoord, brickCoord et un hexagone d'eau
      const hasWood = hexes.some(h => h.equals(woodCoord));
      const hasBrick = hexes.some(h => h.equals(brickCoord));
      
      if (hasWood && hasBrick) {
        // Trouver l'hexagone qui n'est ni wood ni brick (c'est l'eau)
        const waterHex = hexes.find(h => !h.equals(woodCoord) && !h.equals(brickCoord));
        if (waterHex) {
          const hexType = gameMap.getResource(waterHex);
          if (hexType === HexType.Water) {
            // Ajouter la ville sur ce vertex (utiliser le vertex retourné par la grille)
            try {
              gameMap.addCity(vertex, civId);
              const hexList = hexes.map(h => `(${h.q},${h.r})`).join(', ');
              console.log(`[MapGenerator] ✓ Ville créée avec succès sur le vertex: [${hexList}]`);
              return;
            } catch (e) {
              // Ignorer les erreurs (ville déjà présente ou civilisation non enregistrée)
              // mais continuer la recherche
              console.warn(`[MapGenerator] Échec lors de l'ajout de la ville (méthode 1): ${e}`);
            }
          }
        }
      }
    }

    // Méthode 2: Si la méthode 1 échoue, chercher les voisins communs
    // Trouver tous les voisins communs de woodCoord et brickCoord
    const woodNeighbors = woodCoord.neighbors();
    const brickNeighbors = brickCoord.neighbors();
    
    for (const neighborCoord of woodNeighbors) {
      // Vérifier si ce voisin est aussi voisin de brickCoord
      const isNeighborOfBrick = brickNeighbors.some(n => n.equals(neighborCoord));
      
      if (isNeighborOfBrick) {
        // Vérifier si cet hexagone existe dans la grille et est de l'eau
        const neighborHex = grid.getHex(neighborCoord);
        if (neighborHex) {
          const hexType = gameMap.getResource(neighborCoord);
          if (hexType === HexType.Water) {
            // Trouver le vertex correspondant dans la grille (pour utiliser le même instance)
            const vertices = grid.getVerticesForHex(woodCoord);
            for (const vertex of vertices) {
              const hexes = vertex.getHexes();
              if (hexes.some(h => h.equals(woodCoord)) &&
                  hexes.some(h => h.equals(brickCoord)) &&
                  hexes.some(h => h.equals(neighborCoord))) {
                try {
                  gameMap.addCity(vertex, civId);
                  const hexList = hexes.map(h => `(${h.q},${h.r})`).join(', ');
                  console.log(`[MapGenerator] ✓ Ville créée avec succès sur le vertex: [${hexList}]`);
                  return;
                } catch (e) {
                  console.warn(`[MapGenerator] Échec lors de l'ajout de la ville (méthode 2): ${e}`);
                }
              }
            }
          }
        }
      }
    }

    // Si on arrive ici, la ville n'a pas pu être créée
    console.error(`[MapGenerator] ✗ ÉCHEC: Impossible de créer la ville initiale sur le vertex Bois(${woodCoord.q},${woodCoord.r})-Argile(${brickCoord.q},${brickCoord.r})-Eau`);
  }
}
