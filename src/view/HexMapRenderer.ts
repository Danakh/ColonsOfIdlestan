import { GameMap } from '../model/map/GameMap';
import { Hex } from '../model/hex/Hex';
import { HexCoord } from '../model/hex/HexCoord';
import { Vertex } from '../model/hex/Vertex';
import { Edge } from '../model/hex/Edge';
import { HexType } from '../model/map/HexType';
import { CivilizationId } from '../model/map/CivilizationId';
import { City } from '../model/city/City';
import { CityLevel } from '../model/city/CityLevel';

/**
 * Configuration pour le rendu des hexagones.
 */
interface RenderConfig {
  /** Taille d'un hexagone (rayon) en pixels */
  hexSize: number;
  /** Offset X pour centrer la carte */
  offsetX: number;
  /** Offset Y pour centrer la carte */
  offsetY: number;
}

/**
 * Couleur associée à chaque type d'hexagone.
 */
const HEX_TYPE_COLORS: Record<HexType, string> = {
  [HexType.Wood]: '#8B4513',      // Marron (bois)
  [HexType.Brick]: '#CD5C5C',     // Rouge brique
  [HexType.Wheat]: '#FFD700',     // Or (blé)
  [HexType.Sheep]: '#90EE90',     // Vert clair (mouton)
  [HexType.Ore]: '#708090',       // Gris ardoise (minerai)
  [HexType.Desert]: '#F4A460',   // Sable (désert)
  [HexType.Water]: '#4169E1',     // Bleu royal (eau)
};

/**
 * Renderer pour afficher une GameMap sur un canvas HTML5.
 */
export class HexMapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private showCoordinates: boolean = false;
  private currentConfig: RenderConfig | null = null;
  private currentGameMap: GameMap | null = null;
  private onHexClickCallback: ((hexCoord: HexCoord) => void) | null = null;
  private onEdgeClickCallback: ((edge: Edge) => void) | null = null;
  private onVertexClickCallback: ((vertex: Vertex) => void) | null = null;
  private hoveredEdge: Edge | null = null;
  private hoveredVertex: Vertex | null = null;
  private selectedVertex: Vertex | null = null;
  private currentCivilizationId: CivilizationId | null = null;
  private renderCallback: (() => void) | null = null;
  private harvestedHexes: Map<string, number> = new Map(); // Map<hexCoord.hashCode(), timestamp>
  private citySprites: Map<CityLevel, HTMLImageElement> = new Map();
  private citySpritesLoaded: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Impossible d\'obtenir le contexte 2D du canvas');
    }
    this.ctx = context;
    this.setupMouseMoveHandler();
    this.loadCitySprites();
  }

  /**
   * Charge les sprites SVG des villes.
   */
  private loadCitySprites(): void {
    // Le serveur sert les fichiers depuis la racine du projet
    // Les sprites sont accessibles via /assets/sprites/ (depuis la racine)

    const spriteFiles: Record<CityLevel, string> = {
      [CityLevel.Outpost]: 'city-outpost.svg',
      [CityLevel.Colony]: 'city-colony.svg',
      [CityLevel.Town]: 'city-town.svg',
      [CityLevel.Metropolis]: 'city-metropolis.svg',
      [CityLevel.Capital]: 'city-capital.svg',
    };

    let loadedCount = 0;
    const totalSprites = Object.keys(spriteFiles).length;

    const checkAllLoaded = (): void => {
      loadedCount++;
      console.log(`Sprites chargés: ${loadedCount}/${totalSprites}`);
      if (loadedCount === totalSprites) {
        this.citySpritesLoaded = true;
        console.log('Tous les sprites sont chargés !');
        // Re-rendre si nécessaire
        if (this.renderCallback) {
          this.renderCallback();
        }
      }
    };

    for (const [level, filename] of Object.entries(spriteFiles)) {
      const levelNum = Number(level) as CityLevel;
      
      const tryLoad = (): void => {
        const img = new Image();
        const fullPath = "/assets/sprites/" + filename;
        
        img.onload = () => {
          console.log(`Sprite chargé avec succès: ${fullPath} pour le niveau ${levelNum}`);
          this.citySprites.set(levelNum, img);
          checkAllLoaded();
        };
        
        img.onerror = () => {
          console.warn(`Échec du chargement avec ${fullPath}`);
        };
        
        img.src = fullPath;
      };

      tryLoad();
    }
  }

  /**
   * Active ou désactive l'affichage des coordonnées.
   */
  setShowCoordinates(show: boolean): void {
    this.showCoordinates = show;
  }

  /**
   * Dessine la carte complète sur le canvas.
   * @param gameMap - La carte à dessiner
   * @param civId - Optionnel: la civilisation pour laquelle dessiner les routes constructibles
   */
  render(gameMap: GameMap, civId?: CivilizationId): void {
    // Stocker la civilisation actuelle pour la détection de survol
    this.currentCivilizationId = civId || null;
    // Effacer le canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculer les dimensions de la carte
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();

    if (allHexes.length === 0) {
      return;
    }

    // Filtrer uniquement les hexagones visibles
    const visibleHexes = allHexes.filter(hex => gameMap.isHexVisible(hex.coord));

    if (visibleHexes.length === 0) {
      // Si aucun hexagone n'est visible, ne rien dessiner
      return;
    }

    // Trouver les limites de la carte (uniquement pour les hexagones visibles)
    let minQ = Infinity;
    let maxQ = -Infinity;
    let minR = Infinity;
    let maxR = -Infinity;

    for (const hex of visibleHexes) {
      minQ = Math.min(minQ, hex.coord.q);
      maxQ = Math.max(maxQ, hex.coord.q);
      minR = Math.min(minR, hex.coord.r);
      maxR = Math.max(maxR, hex.coord.r);
    }

    // Calculer la taille des hexagones pour que la carte tienne dans le canvas
    const hexSize = this.calculateHexSize(minQ, maxQ, minR, maxR);
    
    // Calculer le centre de la carte en coordonnées hexagonales
    const centerQ = (minQ + maxQ) / 2;
    const centerR = (minR + maxR) / 2;
    
    // Calculer les offsets pour centrer la carte
    const offsetX = this.canvas.width / 2 - Math.sqrt(3) * (centerQ + centerR / 2) * hexSize;
    const offsetY = this.canvas.height / 2 - (3 / 2) * centerR * hexSize;

    const config: RenderConfig = {
      hexSize,
      offsetX,
      offsetY,
    };

    // Stocker la configuration et la carte pour la détection de clic
    this.currentConfig = config;
    this.currentGameMap = gameMap;

    // Dessiner uniquement les hexagones visibles
    for (const hex of visibleHexes) {
      this.drawHex(hex, gameMap, config);
    }

    // Dessiner les coordonnées si activé (uniquement pour les hexagones visibles)
    if (this.showCoordinates) {
      for (const hex of visibleHexes) {
        this.drawCoordinates(hex, config);
      }
    }

    // Dessiner les routes construites (avant les villes pour qu'elles passent sous)
    this.drawRoads(gameMap, config);

    // Dessiner les routes constructibles si une civilisation est fournie (avant les villes)
    if (civId) {
      this.drawBuildableRoads(gameMap, config, civId);
    }

    // Dessiner les villes sur leurs sommets (en dernier pour qu'elles soient par-dessus les routes)
    this.drawCities(gameMap, config);
  }

  /**
   * Définit un callback à appeler pour re-rendre la carte.
   * Utilisé pour mettre à jour l'affichage lors du survol de la souris.
   */
  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  /**
   * Retourne le vertex (ville) actuellement sélectionné, ou null si aucune ville n'est sélectionnée.
   * @returns Le vertex sélectionné ou null
   */
  getSelectedVertex(): Vertex | null {
    return this.selectedVertex;
  }

  /**
   * Déclenche un effet visuel pour indiquer qu'un hexagone a été récolté.
   * L'hexagone sera légèrement réduit pendant un court instant.
   * @param hexCoord - La coordonnée de l'hexagone récolté
   */
  triggerHarvestEffect(hexCoord: HexCoord): void {
    const hexKey = hexCoord.hashCode();
    const now = Date.now();
    this.harvestedHexes.set(hexKey, now);

    // Re-rendre immédiatement pour afficher l'effet
    if (this.renderCallback) {
      this.renderCallback();
    }

    // Nettoyer après la durée de l'animation (150ms)
    setTimeout(() => {
      this.harvestedHexes.delete(hexKey);
      // Re-rendre pour revenir à la taille normale
      if (this.renderCallback) {
        this.renderCallback();
      }
    }, 100);
  }

  /**
   * Calcule la taille optimale des hexagones pour que la carte tienne dans le canvas.
   */
  private calculateHexSize(minQ: number, maxQ: number, minR: number, maxR: number): number {
    const width = maxQ - minQ + 1;
    const height = maxR - minR + 1;

    // Dimensions approximatives d'un hexagone en coordonnées axiales
    // Largeur: sqrt(3) * size, Hauteur: 2 * size
    const hexWidth = Math.sqrt(3);
    const hexHeight = 2;

    // Calculer la taille maximale possible
    const maxWidth = (this.canvas.width * 0.9) / (width * hexWidth);
    const maxHeight = (this.canvas.height * 0.9) / (height * hexHeight);

    return Math.min(maxWidth, maxHeight, 40); // Limiter à 40px max
  }

  /**
   * Dessine un hexagone sur le canvas.
   */
  private drawHex(hex: Hex, gameMap: GameMap, config: RenderConfig): void {
    const { hexSize, offsetX, offsetY } = config;
    const coord = hex.coord;

    // Vérifier si cet hexagone vient d'être récolté (pour l'effet visuel)
    const hexKey = coord.hashCode();
    const harvestTime = this.harvestedHexes.get(hexKey);
    const isHarvested = harvestTime !== undefined;
    
    // Calculer le facteur de réduction (0.85 = réduction de 15%)
    const scale = isHarvested ? 0.85 : 1.0;
    const currentHexSize = hexSize * scale;

    // Convertir les coordonnées axiales en coordonnées pixel
    // Formule: x = sqrt(3) * (q + r/2) * size
    //          y = 3/2 * r * size
    const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
    const y = offsetY + (3 / 2) * coord.r * hexSize;

    // Obtenir le type d'hexagone
    const hexType = gameMap.getHexType(coord) || HexType.Desert;
    const color = HEX_TYPE_COLORS[hexType] || '#CCCCCC';

    // Dessiner l'hexagone avec une rotation de 30° (pointy-top)
    // Rotation de 30° = π/6 radians pour passer de flat-top à pointy-top
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      const hx = x + currentHexSize * Math.cos(angle);
      const hy = y + currentHexSize * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(hx, hy);
      } else {
        this.ctx.lineTo(hx, hy);
      }
    }
    this.ctx.closePath();

    // Remplir avec la couleur de la ressource
    this.ctx.fillStyle = color;
    this.ctx.fill();

    // Dessiner le contour
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  /**
   * Dessine les coordonnées (q, r) au centre d'un hexagone.
   */
  private drawCoordinates(hex: Hex, config: RenderConfig): void {
    const { hexSize, offsetX, offsetY } = config;
    const coord = hex.coord;

    // Convertir les coordonnées axiales en coordonnées pixel (centre de l'hexagone)
    const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
    const y = offsetY + (3 / 2) * coord.r * hexSize;

    // Dessiner le texte des coordonnées
    const text = `(${coord.q},${coord.r})`;
    this.ctx.fillStyle = '#000000';
    this.ctx.font = `${Math.max(8, hexSize / 4)}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Dessiner un fond semi-transparent pour améliorer la lisibilité
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = parseInt(this.ctx.font) || 12;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillRect(
      x - textWidth / 2 - 2,
      y - textHeight / 2 - 2,
      textWidth + 4,
      textHeight + 4
    );
    
    this.ctx.fillStyle = '#000000';
    this.ctx.fillText(text, x, y);
  }

  /**
   * Dessine les villes sur leurs sommets.
   */
  private drawCities(gameMap: GameMap, config: RenderConfig): void {
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();

    // Parcourir tous les hexagones pour trouver leurs vertices
    // Utiliser un Set pour éviter les doublons
    const processedVertices = new Set<string>();

    for (const hex of allHexes) {
      const vertices = grid.getVerticesForHex(hex.coord);
      for (const vertex of vertices) {
        const vertexKey = vertex.hashCode();
        if (!processedVertices.has(vertexKey)) {
          processedVertices.add(vertexKey);
          
          // Vérifier si ce vertex a une ville en utilisant le même vertex retourné par la grille
          // Cela garantit que le hashCode correspond
          if (gameMap.hasCity(vertex)) {
            const city = gameMap.getCity(vertex);
            const isHovered = this.hoveredVertex !== null && this.hoveredVertex.equals(vertex);
            const isSelected = this.selectedVertex !== null && this.selectedVertex.equals(vertex);
            if (city) {
              this.drawCity(vertex, city, config, isHovered, isSelected);
            }
          }
        }
      }
    }
    
    // Debug: Vérifier tous les vertices pour s'assurer qu'on ne manque rien
    // Cela peut aider à identifier les villes non trouvées
    const allVertices = grid.getAllVertices();
    for (const vertex of allVertices) {
      const vertexKey = vertex.hashCode();
      if (gameMap.hasCity(vertex)) {
        // Si on trouve une ville dans getAllVertices mais pas dans drawCities,
        // on la dessine quand même
        if (!processedVertices.has(vertexKey)) {
          const city = gameMap.getCity(vertex);
          const isHovered = this.hoveredVertex !== null && this.hoveredVertex.equals(vertex);
          const isSelected = this.selectedVertex !== null && this.selectedVertex.equals(vertex);
          if (city) {
            this.drawCity(vertex, city, config, isHovered, isSelected);
          }
        }
      }
    }
  }

  /**
   * Dessine une ville sur un sommet avec un sprite correspondant à son niveau.
   * @param vertex - Le sommet où se trouve la ville
   * @param city - La ville à dessiner
   * @param config - La configuration de rendu
   * @param isHovered - true si la ville est survolée par la souris
   * @param isSelected - true si la ville est sélectionnée
   */
  private drawCity(vertex: Vertex, city: City, config: RenderConfig, isHovered: boolean = false, isSelected: boolean = false): void {
    const { hexSize, offsetX, offsetY } = config;
    const hexes = vertex.getHexes();

    // Calculer la position du sommet (centre du triangle formé par les 3 hexagones)
    let sumX = 0;
    let sumY = 0;

    for (const coord of hexes) {
      const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
      const y = offsetY + (3 / 2) * coord.r * hexSize;
      sumX += x;
      sumY += y;
    }

    const centerX = sumX / 3;
    const centerY = sumY / 3;

    // Taille de base du sprite selon le niveau
    let baseSize = 8 + city.level * 2; // 8, 10, 12, 14, 16 pour les niveaux 0-4
    
    // Agrandir si survolée ou sélectionnée
    let scale = 1.0;
    if (isHovered || isSelected) {
      scale = 1.3;
    }
    
    const citySize = baseSize * scale;

    // Sauvegarder le contexte pour restaurer après le dessin
    this.ctx.save();

    // Obtenir le sprite correspondant au niveau
    const sprite = this.citySprites.get(city.level);
    
    // Vérifier que le sprite est chargé et prêt
    const isSpriteReady = sprite && 
                          this.citySpritesLoaded && 
                          sprite.complete && 
                          sprite.naturalWidth > 0;
    
    if (isSpriteReady) {
      // Calculer les dimensions de l'image
      const spriteWidth = baseSize * scale;
      const spriteHeight = baseSize * scale;

      // Appliquer la transformation pour le scale et la position
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(scale, scale);

      // Dessiner le sprite
      this.ctx.drawImage(
        sprite,
        -baseSize / 2,
        -baseSize / 2,
        baseSize,
        baseSize
      );

      // Appliquer une teinte de couleur selon l'état (survol ou sélection)
      if (isSelected) {
        // Orange pour la sélection : overlay coloré
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.fillStyle = 'rgba(255, 165, 0, 0.4)'; // Orange semi-transparent
        this.ctx.fillRect(-baseSize / 2, -baseSize / 2, baseSize, baseSize);
        this.ctx.globalCompositeOperation = 'source-over';
      } else if (isHovered) {
        // Jaune doré pour le survol : overlay coloré
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; // Jaune doré semi-transparent
        this.ctx.fillRect(-baseSize / 2, -baseSize / 2, baseSize, baseSize);
        this.ctx.globalCompositeOperation = 'source-over';
      }
    } else {
      // Fallback : dessiner un carré simple si les sprites ne sont pas encore chargés
      const fallbackSize = baseSize * scale;
      let baseColor = '#2C2C2C';
      if (isSelected) {
        baseColor = '#FFA500';
      } else if (isHovered) {
        baseColor = '#FFD700';
      }
      this.ctx.fillStyle = baseColor;
      this.ctx.fillRect(centerX - fallbackSize / 2, centerY - fallbackSize / 2, fallbackSize, fallbackSize);
    }

    // Restaurer le contexte
    this.ctx.restore();

    // Dessiner une bordure si sélectionnée (après le restore pour la taille normale)
    if (isSelected) {
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, citySize / 2 + 3, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }


  /**
   * Dessine les routes construites sur la carte.
   */
  private drawRoads(gameMap: GameMap, config: RenderConfig): void {
    const grid = gameMap.getGrid();
    const allEdges = grid.getAllEdges();

    // Utiliser un Set pour éviter de dessiner deux fois la même route
    const drawnEdges = new Set<string>();

    for (const edge of allEdges) {
      if (gameMap.hasRoad(edge)) {
        const edgeKey = edge.hashCode();
        if (!drawnEdges.has(edgeKey)) {
          drawnEdges.add(edgeKey);
          this.drawRoad(edge, config, false, gameMap); // false = trait plein
        }
      }
    }
  }

  /**
   * Dessine les routes constructibles pour une civilisation.
   */
  private drawBuildableRoads(
    gameMap: GameMap,
    config: RenderConfig,
    civId: CivilizationId
  ): void {
    const buildableRoads = gameMap.getBuildableRoadsForCivilization(civId);

    for (const edge of buildableRoads) {
      const isHighlighted = this.hoveredEdge !== null && this.hoveredEdge.equals(edge);
      this.drawRoad(edge, config, true, gameMap, isHighlighted); // true = trait pointillé
    }
  }

  /**
   * Dessine une route (construite ou constructible) sur une arête.
   * @param edge - L'arête à dessiner
   * @param config - La configuration de rendu
   * @param isDashed - true pour un trait pointillé (route constructible), false pour un trait plein (route construite)
   * @param isHighlighted - true pour mettre en surbrillance (route survolée)
   */
  private drawRoad(edge: Edge, config: RenderConfig, isDashed: boolean, gameMap: GameMap, isHighlighted: boolean = false): void {
    const { hexSize, offsetX, offsetY } = config;
    const [hex1, hex2] = edge.getHexes();

    // Obtenir les vertices de l'edge (un edge a deux vertices)
    const vertices = gameMap.getVerticesForEdge(edge);
    
    if (vertices.length < 2) {
      // Fallback: utiliser les coins calculés à partir de la direction
      this.drawRoadFromDirection(edge, config, isDashed, isHighlighted);
      return;
    }

    // Calculer les positions des deux vertices
    const vertex1 = vertices[0];
    const vertex2 = vertices[1];

    const pos1 = this.getVertexPosition(vertex1, config);
    const pos2 = this.getVertexPosition(vertex2, config);

    // Dessiner la ligne entre les deux vertices
    this.ctx.beginPath();
    this.ctx.moveTo(pos1.x, pos1.y);
    this.ctx.lineTo(pos2.x, pos2.y);

    // Configurer le style
    if (isHighlighted) {
      // Surbrillance : couleur plus claire et trait plus épais
      this.ctx.strokeStyle = '#FFA500'; // Orange
      this.ctx.lineWidth = 6;
    } else {
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 4;
    }

    if (isDashed) {
      // Trait pointillé pour les routes constructibles
      this.ctx.setLineDash([5, 5]);
    } else {
      // Trait plein pour les routes construites
      this.ctx.setLineDash([]);
    }

    this.ctx.stroke();
    
    // Réinitialiser le lineDash pour ne pas affecter les autres dessins
    this.ctx.setLineDash([]);
  }

  /**
   * Calcule la position d'un vertex en pixels.
   * Un vertex est le point où 3 hexagones se rencontrent (un coin d'hexagone).
   */
  private getVertexPosition(vertex: Vertex, config: RenderConfig): { x: number; y: number } {
    const { hexSize, offsetX, offsetY } = config;
    const hexes = vertex.getHexes();

    // Pour un vertex, on peut calculer la position comme la moyenne des centres des 3 hexagones
    // Mais plus précisément, un vertex est un coin d'hexagone, donc on peut le calculer
    // en trouvant le coin commun aux 3 hexagones
    
    // Approche simple: moyenne des centres (ce qui donne approximativement le coin)
    let sumX = 0;
    let sumY = 0;

    for (const coord of hexes) {
      const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
      const y = offsetY + (3 / 2) * coord.r * hexSize;
      sumX += x;
      sumY += y;
    }

    return {
      x: sumX / 3,
      y: sumY / 3,
    };
  }

  /**
   * Dessine une route en utilisant la direction entre les deux hexagones (fallback).
   */
  private drawRoadFromDirection(edge: Edge, config: RenderConfig, isDashed: boolean, isHighlighted: boolean = false): void {
    const { hexSize, offsetX, offsetY } = config;
    const [hex1, hex2] = edge.getHexes();

    // Calculer les positions des centres des deux hexagones
    const centerX1 = offsetX + Math.sqrt(3) * (hex1.q + hex1.r / 2) * hexSize;
    const centerY1 = offsetY + (3 / 2) * hex1.r * hexSize;

    // Déterminer la direction de hex1 vers hex2
    const dq = hex2.q - hex1.q;
    const dr = hex2.r - hex1.r;

    // Mapper la direction (dq, dr) vers l'index du coin
    // Pour un hexagone pointy-top, les directions sont:
    // N: (0, -1) -> coin entre 0 et 1
    // NE: (1, -1) -> coin entre 1 et 2
    // SE: (1, 0) -> coin entre 2 et 3
    // S: (0, 1) -> coin entre 3 et 4
    // SW: (-1, 1) -> coin entre 4 et 5
    // NW: (-1, 0) -> coin entre 5 et 0

    let cornerIndex1: number;
    let cornerIndex2: number;

    if (dq === 0 && dr === -1) {
      // N
      cornerIndex1 = 0;
      cornerIndex2 = 1;
    } else if (dq === 1 && dr === -1) {
      // NE
      cornerIndex1 = 1;
      cornerIndex2 = 2;
    } else if (dq === 1 && dr === 0) {
      // SE
      cornerIndex1 = 2;
      cornerIndex2 = 3;
    } else if (dq === 0 && dr === 1) {
      // S
      cornerIndex1 = 3;
      cornerIndex2 = 4;
    } else if (dq === -1 && dr === 1) {
      // SW
      cornerIndex1 = 4;
      cornerIndex2 = 5;
    } else if (dq === -1 && dr === 0) {
      // NW
      cornerIndex1 = 5;
      cornerIndex2 = 0;
    } else {
      // Fallback: utiliser les centres si la direction n'est pas reconnue
      const centerX2 = offsetX + Math.sqrt(3) * (hex2.q + hex2.r / 2) * hexSize;
      const centerY2 = offsetY + (3 / 2) * hex2.r * hexSize;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX1, centerY1);
      this.ctx.lineTo(centerX2, centerY2);
      if (isHighlighted) {
        this.ctx.strokeStyle = '#FFA500'; // Orange
        this.ctx.lineWidth = 6;
      } else {
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 4;
      }
      if (isDashed) {
        this.ctx.setLineDash([5, 5]);
      } else {
        this.ctx.setLineDash([]);
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      return;
    }

    // Calculer les positions des deux coins de hex1 qui forment l'edge
    const angle1 = (Math.PI / 3) * cornerIndex1 + Math.PI / 6;
    const angle2 = (Math.PI / 3) * cornerIndex2 + Math.PI / 6;
    
    const cornerX1 = centerX1 + hexSize * Math.cos(angle1);
    const cornerY1 = centerY1 + hexSize * Math.sin(angle1);
    const cornerX2 = centerX1 + hexSize * Math.cos(angle2);
    const cornerY2 = centerY1 + hexSize * Math.sin(angle2);

    // Dessiner la ligne entre les deux coins
    this.ctx.beginPath();
    this.ctx.moveTo(cornerX1, cornerY1);
    this.ctx.lineTo(cornerX2, cornerY2);

    // Configurer le style
    if (isHighlighted) {
      // Surbrillance : couleur plus claire et trait plus épais
      this.ctx.strokeStyle = '#FFA500'; // Orange
      this.ctx.lineWidth = 6;
    } else {
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 4;
    }

    if (isDashed) {
      // Trait pointillé pour les routes constructibles
      this.ctx.setLineDash([5, 5]);
    } else {
      // Trait plein pour les routes construites
      this.ctx.setLineDash([]);
    }

    this.ctx.stroke();
    
    // Réinitialiser le lineDash pour ne pas affecter les autres dessins
    this.ctx.setLineDash([]);
  }

  /**
   * Redimensionne le canvas pour qu'il s'adapte à la fenêtre.
   */
  resize(): void {
    // Ajuster la taille du canvas en tenant compte du header, footer, panneau de ressources et panneau de ville
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const resourcesPanel = document.getElementById('resources-panel');
    const cityPanel = document.getElementById('city-panel');
    const main = document.querySelector('main');
    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;
    
    // Tenir compte du panneau de ville s'il est visible
    let cityPanelWidth = 0;
    if (cityPanel && !cityPanel.classList.contains('hidden')) {
      cityPanelWidth = cityPanel.offsetWidth;
      const mainStyle = main ? window.getComputedStyle(main) : null;
      const gap = mainStyle ? parseFloat(mainStyle.gap) || 16 : 16;
      cityPanelWidth += gap; // Ajouter le gap entre le canvas et le panneau
    }
    
    // Calculer le padding du main (2rem de chaque côté)
    const mainStyle = main ? window.getComputedStyle(main) : null;
    const mainPaddingX = mainStyle ? (parseFloat(mainStyle.paddingLeft) || 32) + (parseFloat(mainStyle.paddingRight) || 32) : 64;
    
    // Largeur disponible = largeur fenêtre - padding main - panneau ville
    this.canvas.width = window.innerWidth - mainPaddingX - cityPanelWidth;
    this.canvas.height = window.innerHeight - headerHeight - footerHeight;
  }

  /**
   * Convertit les coordonnées pixel (x, y) en coordonnées hexagonales (q, r).
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @returns Les coordonnées hexagonales correspondantes, ou null si hors carte
   */
  pixelToHexCoord(pixelX: number, pixelY: number): HexCoord | null {
    if (!this.currentConfig || !this.currentGameMap) {
      return null;
    }

    const { hexSize, offsetX, offsetY } = this.currentConfig;
    const grid = this.currentGameMap.getGrid();

    // Convertir les coordonnées pixel en coordonnées hexagonales
    // Formule inverse de: 
    // x = sqrt(3) * (q + r/2) * size
    // y = 3/2 * r * size
    // 
    // Inverse:
    // r = (2/3 * y) / size
    // q = x / (sqrt(3) * size) - r/2
    
    // Convertir pixel canvas -> coordonnées relatives au centre (après offset)
    const x = pixelX - offsetX;
    const y = pixelY - offsetY;
    
    // Calculer r d'abord
    const r = (2 / 3 * y) / hexSize;
    // Puis calculer q
    const q = x / (Math.sqrt(3) * hexSize) - r / 2;

    // Arrondir pour obtenir les coordonnées hexagonales les plus proches
    const hexQ = Math.round(q);
    const hexR = Math.round(r);
    
    // Vérifier les 7 candidats possibles (hexagone calculé + ses 6 voisins)
    const candidates = [
      new HexCoord(hexQ, hexR),
      new HexCoord(hexQ + 1, hexR),
      new HexCoord(hexQ - 1, hexR),
      new HexCoord(hexQ, hexR + 1),
      new HexCoord(hexQ, hexR - 1),
      new HexCoord(hexQ + 1, hexR - 1),
      new HexCoord(hexQ - 1, hexR + 1),
    ];
    
    // Trouver le candidat le plus proche du point cliqué
    let closestHex: HexCoord | null = null;
    let minDistance = Infinity;
    const maxDistance = hexSize * 0.9; // Distance maximale (rayon de l'hexagone)
    
    for (const candidate of candidates) {
      if (!grid.hasHex(candidate)) {
        continue;
      }
      
      // Calculer la position du centre de cet hexagone avec les MÊMES formules que drawHex
      const hexX = offsetX + Math.sqrt(3) * (candidate.q + candidate.r / 2) * hexSize;
      const hexY = offsetY + (3 / 2) * candidate.r * hexSize;
      
      // Calculer la distance depuis le point cliqué
      const dx = pixelX - hexX;
      const dy = pixelY - hexY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Si la distance est inférieure au rayon et est la plus petite
      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestHex = candidate;
      }
    }
    
    return closestHex;
  }

  /**
   * Définit le callback à appeler lorsqu'un hexagone est cliqué.
   * @param callback - Fonction appelée avec les coordonnées hexagonales du clic
   */
  setOnHexClick(callback: (hexCoord: HexCoord) => void): void {
    this.onHexClickCallback = callback;
    this.setupClickHandler();
  }

  /**
   * Convertit les coordonnées pixel (x, y) en Vertex (sommet avec ville) si le clic est proche d'un vertex avec une ville.
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @returns Le vertex avec une ville le plus proche du point cliqué, ou null si aucun vertex n'est assez proche
   */
  pixelToVertex(pixelX: number, pixelY: number): Vertex | null {
    if (!this.currentConfig || !this.currentGameMap) {
      return null;
    }

    const gameMap = this.currentGameMap;
    const grid = gameMap.getGrid();
    const allVertices = grid.getAllVertices();

    let closestVertex: Vertex | null = null;
    let minDistance = Infinity;
    const maxDistance = 12; // Distance maximale en pixels (taille de la ville + marge)

    for (const vertex of allVertices) {
      // Ne vérifier que les vertices qui ont une ville
      if (!gameMap.hasCity(vertex)) {
        continue;
      }

      // Calculer la position du vertex
      const pos = this.getVertexPosition(vertex, this.currentConfig);

      // Calculer la distance du point cliqué au vertex
      const dx = pixelX - pos.x;
      const dy = pixelY - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestVertex = vertex;
      }
    }

    return closestVertex;
  }

  /**
   * Convertit les coordonnées pixel (x, y) en Edge (arête) si le clic est proche d'une arête.
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @returns L'arête la plus proche du point cliqué, ou null si aucune arête n'est assez proche
   */
  pixelToEdge(pixelX: number, pixelY: number): Edge | null {
    if (!this.currentConfig || !this.currentGameMap) {
      return null;
    }

    const gameMap = this.currentGameMap;
    const grid = gameMap.getGrid();
    const allEdges = grid.getAllEdges();

    let closestEdge: Edge | null = null;
    let minDistance = Infinity;
    const maxDistance = 8; // Distance maximale en pixels pour considérer qu'on a cliqué sur une arête

    for (const edge of allEdges) {
      // Obtenir les vertices de l'edge
      const vertices = gameMap.getVerticesForEdge(edge);
      
      if (vertices.length < 2) {
        continue;
      }

      // Calculer les positions des deux vertices
      const pos1 = this.getVertexPosition(vertices[0], this.currentConfig);
      const pos2 = this.getVertexPosition(vertices[1], this.currentConfig);

      // Calculer la distance du point cliqué au segment de ligne formé par les deux vertices
      const distance = this.distanceToLineSegment(pixelX, pixelY, pos1.x, pos1.y, pos2.x, pos2.y);

      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestEdge = edge;
      }
    }

    return closestEdge;
  }

  /**
   * Calcule la distance d'un point à un segment de ligne.
   * @param px - Coordonnée X du point
   * @param py - Coordonnée Y du point
   * @param x1 - Coordonnée X du premier point du segment
   * @param y1 - Coordonnée Y du premier point du segment
   * @param x2 - Coordonnée X du deuxième point du segment
   * @param y2 - Coordonnée Y du deuxième point du segment
   * @returns La distance minimale du point au segment
   */
  private distanceToLineSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Le segment est un point
      const dx2 = px - x1;
      const dy2 = py - y1;
      return Math.sqrt(dx2 * dx2 + dy2 * dy2);
    }

    // Calculer le paramètre t qui représente la projection du point sur le segment
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));

    // Calculer le point le plus proche sur le segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    // Calculer la distance
    const dx3 = px - closestX;
    const dy3 = py - closestY;
    return Math.sqrt(dx3 * dx3 + dy3 * dy3);
  }

  /**
   * Définit le callback à appeler lorsqu'une arête (route) est cliquée.
   * @param callback - Fonction appelée avec l'arête cliquée
   */
  setOnEdgeClick(callback: (edge: Edge) => void): void {
    this.onEdgeClickCallback = callback;
    this.setupClickHandler();
  }

  /**
   * Configure le gestionnaire de clic unique qui gère à la fois les clics sur les edges et les hexagones.
   * Priorité aux edges : si on clique sur un edge, on ne déclenche pas le clic sur l'hexagone.
   */
  private setupClickHandler(): void {
    // Supprimer les anciens listeners s'ils existent
    this.canvas.removeEventListener('click', this.handleClick);
    
    // Ajouter le nouveau listener
    this.canvas.addEventListener('click', this.handleClick);
  }

  /**
   * Configure le gestionnaire de mouvement de souris pour la surbrillance des routes constructibles.
   */
  private setupMouseMoveHandler(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  /**
   * Gestionnaire de mouvement de souris pour mettre en surbrillance les routes constructibles et les villes.
   */
  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.currentConfig || !this.currentGameMap) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    
    // Calculer les coordonnées en tenant compte de l'échelle CSS si le canvas est redimensionné
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;

    let needsRender = false;

    // PRIORITÉ 1: Vérifier d'abord si on survole une ville
    const vertex = this.pixelToVertex(pixelX, pixelY);
    if (vertex) {
      // On survole une ville
      if (!this.hoveredVertex || !this.hoveredVertex.equals(vertex)) {
        this.hoveredVertex = vertex;
        // Retirer la surbrillance des routes si on survole une ville
        if (this.hoveredEdge !== null) {
          this.hoveredEdge = null;
        }
        needsRender = true;
      }
    } else {
      // Pas de ville sous la souris, vérifier les routes constructibles
      if (this.currentCivilizationId) {
        const edge = this.pixelToEdge(pixelX, pixelY);
        
        if (edge) {
          const buildableRoads = this.currentGameMap.getBuildableRoadsForCivilization(this.currentCivilizationId);
          const isBuildable = buildableRoads.some(buildableEdge => buildableEdge.equals(edge));
          
          if (isBuildable) {
            if (!this.hoveredEdge || !this.hoveredEdge.equals(edge)) {
              this.hoveredEdge = edge;
              needsRender = true;
            }
          } else {
            // Route non constructible, retirer la surbrillance
            if (this.hoveredEdge !== null) {
              this.hoveredEdge = null;
              needsRender = true;
            }
          }
        } else {
          // Pas d'arête constructible, retirer la surbrillance
          if (this.hoveredEdge !== null) {
            this.hoveredEdge = null;
            needsRender = true;
          }
        }
      }

      // Retirer la surbrillance de la ville si on ne survole plus
      if (this.hoveredVertex !== null) {
        this.hoveredVertex = null;
        needsRender = true;
      }
    }

    // Re-rendre seulement si nécessaire
    if (needsRender && this.renderCallback) {
      this.renderCallback();
    }
  };

  /**
   * Gestionnaire quand la souris quitte le canvas.
   */
  private handleMouseLeave = (): void => {
    let needsRender = false;
    
    if (this.hoveredEdge !== null) {
      this.hoveredEdge = null;
      needsRender = true;
    }
    
    if (this.hoveredVertex !== null) {
      this.hoveredVertex = null;
      needsRender = true;
    }

    if (needsRender && this.renderCallback) {
      this.renderCallback();
    }
  };

  /**
   * Gestionnaire de clic qui vérifie d'abord les villes (priorité maximale), puis les edges, puis les hexagones.
   */
  private handleClick = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    
    // Calculer les coordonnées en tenant compte de l'échelle CSS si le canvas est redimensionné
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;

    // PRIORITÉ 1: Vérifier d'abord si on a cliqué sur une ville (vertex avec ville)
    const vertex = this.pixelToVertex(pixelX, pixelY);
    if (vertex && this.currentGameMap && this.currentGameMap.hasCity(vertex)) {
      // Sélectionner/désélectionner la ville
      if (this.selectedVertex && this.selectedVertex.equals(vertex)) {
        // Désélectionner si on reclique sur la même ville
        this.selectedVertex = null;
      } else {
        // Sélectionner la nouvelle ville
        this.selectedVertex = vertex;
      }
      
      // Appeler le callback si défini
      if (this.onVertexClickCallback) {
        this.onVertexClickCallback(vertex);
      }
      
      // Re-rendre pour afficher la sélection
      if (this.renderCallback) {
        this.renderCallback();
      }
      
      return; // Ne pas vérifier les edges ni les hexagones si on a cliqué sur une ville
    }

    // Si on a cliqué ailleurs que sur une ville, désélectionner
    if (this.selectedVertex !== null) {
      this.selectedVertex = null;
      if (this.renderCallback) {
        this.renderCallback();
      }
    }

    // PRIORITÉ 2: Vérifier si on a cliqué sur un edge
    if (this.onEdgeClickCallback) {
      const edge = this.pixelToEdge(pixelX, pixelY);
      if (edge) {
        this.onEdgeClickCallback(edge);
        return; // Ne pas vérifier les hexagones si on a cliqué sur un edge
      }
    }

    // PRIORITÉ 3: Vérifier si on a cliqué sur un hexagone
    if (this.onHexClickCallback) {
      const hexCoord = this.pixelToHexCoord(pixelX, pixelY);
      if (hexCoord) {
        this.onHexClickCallback(hexCoord);
      }
    }
  };
}
