import { GameMap } from '../model/map/GameMap';
import { Hex } from '../model/hex/Hex';
import { HexCoord } from '../model/hex/HexCoord';
import { Vertex } from '../model/hex/Vertex';
import { ResourceType } from '../model/map/ResourceType';

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
 * Couleur associée à chaque type de ressource.
 */
const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Wood]: '#8B4513',      // Marron (bois)
  [ResourceType.Brick]: '#CD5C5C',     // Rouge brique
  [ResourceType.Wheat]: '#FFD700',     // Or (blé)
  [ResourceType.Sheep]: '#90EE90',     // Vert clair (mouton)
  [ResourceType.Ore]: '#708090',       // Gris ardoise (minerai)
  [ResourceType.Desert]: '#F4A460',   // Sable (désert)
  [ResourceType.Water]: '#4169E1',     // Bleu royal (eau)
};

/**
 * Renderer pour afficher une GameMap sur un canvas HTML5.
 */
export class HexMapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private showCoordinates: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Impossible d\'obtenir le contexte 2D du canvas');
    }
    this.ctx = context;
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
   */
  render(gameMap: GameMap): void {
    // Effacer le canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculer les dimensions de la carte
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();

    if (allHexes.length === 0) {
      return;
    }

    // Trouver les limites de la carte
    let minQ = Infinity;
    let maxQ = -Infinity;
    let minR = Infinity;
    let maxR = -Infinity;

    for (const hex of allHexes) {
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

    // Dessiner tous les hexagones
    for (const hex of allHexes) {
      this.drawHex(hex, gameMap, config);
    }

    // Dessiner les coordonnées si activé
    if (this.showCoordinates) {
      for (const hex of allHexes) {
        this.drawCoordinates(hex, config);
      }
    }

    // Dessiner les villes sur leurs sommets
    this.drawCities(gameMap, config);
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

    // Convertir les coordonnées axiales en coordonnées pixel
    // Formule: x = sqrt(3) * (q + r/2) * size
    //          y = 3/2 * r * size
    const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
    const y = offsetY + (3 / 2) * coord.r * hexSize;

    // Obtenir la ressource de cet hexagone
    const resource = gameMap.getResource(coord) || ResourceType.Desert;
    const color = RESOURCE_COLORS[resource] || '#CCCCCC';

    // Dessiner l'hexagone avec une rotation de 30° (pointy-top)
    // Rotation de 30° = π/6 radians pour passer de flat-top à pointy-top
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      const hx = x + hexSize * Math.cos(angle) * 0.9;
      const hy = y + hexSize * Math.sin(angle) * 0.9;
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
            this.drawCity(vertex, config);
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
          this.drawCity(vertex, config);
        }
      }
    }
  }

  /**
   * Dessine une ville sur un sommet (petit carré noir).
   */
  private drawCity(vertex: Vertex, config: RenderConfig): void {
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

    // Dessiner un petit carré noir (taille 6x6 pixels)
    const citySize = 6;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(
      centerX - citySize / 2,
      centerY - citySize / 2,
      citySize,
      citySize
    );
  }

  /**
   * Redimensionne le canvas pour qu'il s'adapte à la fenêtre.
   */
  resize(): void {
    // Ajuster la taille du canvas en tenant compte du header et footer
    // Le canvas doit prendre tout l'espace disponible dans main
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - headerHeight - footerHeight;
  }
}
