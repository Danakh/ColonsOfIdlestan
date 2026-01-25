import { HexCoord } from '../model/hex/HexCoord';
import { Edge } from '../model/hex/Edge';
import { Vertex } from '../model/hex/Vertex';
import { IslandMap } from '../model/map/IslandMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { HexMapRenderer, RenderConfig } from '../view/HexMapRenderer';

/**
 * Contrôleur pour gérer les interactions utilisateur avec la carte (clics, survols, sélection).
 * 
 * Cette classe gère :
 * - La détection des interactions utilisateur (clics, mouvements de souris)
 * - L'état de sélection et de survol
 * - La conversion des coordonnées pixel vers les objets de jeu (HexCoord, Edge, Vertex)
 * - La communication avec le renderer pour le rendu
 */
export class MapInteractionController {
  private selectedVertex: Vertex | null = null;
  private hoveredVertex: Vertex | null = null;
  private hoveredEdge: Edge | null = null;
  private currentIslandMap: IslandMap | null = null;
  private currentCivilizationId: CivilizationId | null = null;

  private onHexClickCallback: ((hexCoord: HexCoord) => void) | null = null;
  private onEdgeClickCallback: ((edge: Edge) => void) | null = null;
  private onVertexClickCallback: ((vertex: Vertex) => void) | null = null;
  private onStateChangeCallback: (() => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly renderer: HexMapRenderer
  ) {
    this.setupEventHandlers();
  }

  /**
   * Obtient la configuration actuelle du rendu depuis le renderer.
   */
  private getRenderConfig(): RenderConfig | null {
    return this.renderer.getRenderConfig();
  }

  /**
   * Retourne l'état actuel de sélection et de survol pour le rendu.
   */
  getRenderState() {
    return {
      selectedVertex: this.selectedVertex,
      hoveredVertex: this.hoveredVertex,
      hoveredEdge: this.hoveredEdge,
    };
  }

  /**
   * Définit la carte de jeu actuelle.
   */
  setIslandMap(islandMap: IslandMap): void {
    this.currentIslandMap = islandMap;
  }

  /**
   * Définit l'identifiant de la civilisation actuelle.
   */
  setCivilizationId(civId: CivilizationId | null): void {
    this.currentCivilizationId = civId;
  }

  /**
   * Retourne le vertex actuellement sélectionné.
   */
  getSelectedVertex(): Vertex | null {
    return this.selectedVertex;
  }

  /**
   * Retourne le vertex actuellement survolé.
   */
  getHoveredVertex(): Vertex | null {
    return this.hoveredVertex;
  }

  /**
   * Retourne l'edge actuellement survolé.
   */
  getHoveredEdge(): Edge | null {
    return this.hoveredEdge;
  }

  /**
   * Définit le callback pour les clics sur les hexagones.
   */
  setOnHexClick(callback: (hexCoord: HexCoord) => void): void {
    this.onHexClickCallback = callback;
  }

  /**
   * Définit le callback pour les clics sur les edges.
   */
  setOnEdgeClick(callback: (edge: Edge) => void): void {
    this.onEdgeClickCallback = callback;
  }

  /**
   * Définit le callback pour les clics sur les vertices.
   */
  setOnVertexClick(callback: (vertex: Vertex) => void): void {
    this.onVertexClickCallback = callback;
  }

  /**
   * Définit le callback appelé lorsque l'état change (sélection/hover).
   * Ce callback devrait déclencher un re-render.
   */
  setOnStateChange(callback: () => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Configure les gestionnaires d'événements sur le canvas.
   */
  private setupEventHandlers(): void {
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  /**
   * Convertit les coordonnées pixel (x, y) en coordonnées hexagonales (q, r).
   */
  pixelToHexCoord(pixelX: number, pixelY: number): HexCoord | null {
    const config = this.getRenderConfig();
    if (!config || !this.currentIslandMap) {
      return null;
    }

    const { hexSize, offsetX, offsetY } = config;
    const grid = this.currentIslandMap.getGrid();

    const x = pixelX - offsetX;
    const y = pixelY - offsetY;

    const r = (2 / 3 * y) / hexSize;
    const q = x / (Math.sqrt(3) * hexSize) - r / 2;

    const hexQ = Math.round(q);
    const hexR = Math.round(r);

    const candidates = [
      new HexCoord(hexQ, hexR),
      new HexCoord(hexQ + 1, hexR),
      new HexCoord(hexQ - 1, hexR),
      new HexCoord(hexQ, hexR + 1),
      new HexCoord(hexQ, hexR - 1),
      new HexCoord(hexQ + 1, hexR - 1),
      new HexCoord(hexQ - 1, hexR + 1),
    ];

    let closestHex: HexCoord | null = null;
    let minDistance = Infinity;
    const maxDistance = hexSize * 0.9;

    for (const candidate of candidates) {
      if (!grid.hasHex(candidate)) {
        continue;
      }

      const hexX = offsetX + Math.sqrt(3) * (candidate.q + candidate.r / 2) * hexSize;
      const hexY = offsetY + (3 / 2) * candidate.r * hexSize;

      const dx = pixelX - hexX;
      const dy = pixelY - hexY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestHex = candidate;
      }
    }

    return closestHex;
  }

  /**
   * Convertit les coordonnées pixel (x, y) en Vertex si le clic est proche d'un vertex avec une ville.
   */
  pixelToVertex(pixelX: number, pixelY: number): Vertex | null {
    const config = this.getRenderConfig();
    if (!config || !this.currentIslandMap) {
      return null;
    }

    const islandMap = this.currentIslandMap;
    const grid = islandMap.getGrid();
    const allVertices = grid.getAllVertices();

    let closestVertex: Vertex | null = null;
    let minDistance = Infinity;
    const maxDistance = 12;

    for (const vertex of allVertices) {
      if (!islandMap.hasCity(vertex)) {
        continue;
      }

      const pos = this.getVertexPosition(vertex, config);
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
   * Convertit les coordonnées pixel (x, y) en Edge si le clic est proche d'une arête.
   */
  pixelToEdge(pixelX: number, pixelY: number): Edge | null {
    const config = this.getRenderConfig();
    if (!config || !this.currentIslandMap) {
      return null;
    }

    const islandMap = this.currentIslandMap;
    const grid = islandMap.getGrid();
    const allEdges = grid.getAllEdges();

    let closestEdge: Edge | null = null;
    let minDistance = Infinity;
    const maxDistance = 8;

    for (const edge of allEdges) {
      const vertices = islandMap.getVerticesForEdge(edge);
      if (vertices.length < 2) {
        continue;
      }

      const pos1 = this.getVertexPosition(vertices[0], config);
      const pos2 = this.getVertexPosition(vertices[1], config);
      const distance = this.distanceToLineSegment(pixelX, pixelY, pos1.x, pos1.y, pos2.x, pos2.y);

      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestEdge = edge;
      }
    }

    return closestEdge;
  }

  /**
   * Calcule la position d'un vertex en pixels.
   */
  private getVertexPosition(vertex: Vertex, config: RenderConfig): { x: number; y: number } {
    const { hexSize, offsetX, offsetY } = config;
    const hexes = vertex.getHexes();

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
   * Calcule la distance d'un point à un segment de ligne.
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
      const dx2 = px - x1;
      const dy2 = py - y1;
      return Math.sqrt(dx2 * dx2 + dy2 * dy2);
    }

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const dx3 = px - closestX;
    const dy3 = py - closestY;
    return Math.sqrt(dx3 * dx3 + dy3 * dy3);
  }

  /**
   * Gestionnaire de mouvement de souris pour mettre en surbrillance les routes constructibles et les villes.
   */
  private handleMouseMove = (event: MouseEvent): void => {
    const config = this.getRenderConfig();
    if (!config || !this.currentIslandMap) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;

    let needsRender = false;

    // PRIORITÉ 1: Vérifier d'abord si on survole une ville
    const vertex = this.pixelToVertex(pixelX, pixelY);
    if (vertex) {
      if (!this.hoveredVertex || !this.hoveredVertex.equals(vertex)) {
        this.hoveredVertex = vertex;
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
          const buildableRoads = this.currentIslandMap.getBuildableRoadsForCivilization(this.currentCivilizationId);
          const isBuildable = buildableRoads.some(buildableEdge => buildableEdge.equals(edge));

          if (isBuildable) {
            if (!this.hoveredEdge || !this.hoveredEdge.equals(edge)) {
              this.hoveredEdge = edge;
              needsRender = true;
            }
          } else {
            if (this.hoveredEdge !== null) {
              this.hoveredEdge = null;
              needsRender = true;
            }
          }
        } else {
          if (this.hoveredEdge !== null) {
            this.hoveredEdge = null;
            needsRender = true;
          }
        }
      }

      if (this.hoveredVertex !== null) {
        this.hoveredVertex = null;
        needsRender = true;
      }
    }

    if (needsRender && this.onStateChangeCallback) {
      this.onStateChangeCallback();
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

    if (needsRender && this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  };

  /**
   * Gestionnaire de clic qui vérifie d'abord les villes (priorité maximale), puis les edges, puis les hexagones.
   */
  private handleClick = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;

    // PRIORITÉ 1: Vérifier d'abord si on a cliqué sur une ville
    const vertex = this.pixelToVertex(pixelX, pixelY);
    if (vertex && this.currentIslandMap && this.currentIslandMap.hasCity(vertex)) {
      // Sélectionner/désélectionner la ville
      if (this.selectedVertex && this.selectedVertex.equals(vertex)) {
        this.selectedVertex = null;
      } else {
        this.selectedVertex = vertex;
      }

      if (this.onVertexClickCallback) {
        this.onVertexClickCallback(vertex);
      }

      if (this.onStateChangeCallback) {
        this.onStateChangeCallback();
      }

      return;
    }

    // Si on a cliqué ailleurs que sur une ville, désélectionner
    if (this.selectedVertex !== null) {
      this.selectedVertex = null;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback();
      }
    }

    // PRIORITÉ 2: Vérifier si on a cliqué sur un edge
    if (this.onEdgeClickCallback) {
      const edge = this.pixelToEdge(pixelX, pixelY);
      if (edge) {
        this.onEdgeClickCallback(edge);
        return;
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
