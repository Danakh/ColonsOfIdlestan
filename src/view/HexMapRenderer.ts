import { IslandMap } from '../model/map/IslandMap';
import { Hex } from '../model/hex/Hex';
import { HexCoord } from '../model/hex/HexCoord';
import { Vertex } from '../model/hex/Vertex';
import { Edge } from '../model/hex/Edge';
import { HexType } from '../model/map/HexType';
import { ResourceType } from '../model/map/ResourceType';
import { CivilizationId } from '../model/map/CivilizationId';
import { City } from '../model/city/City';
import { CityLevel } from '../model/city/CityLevel';
import { ResourceHarvestController } from '../controller/ResourceHarvestController';
import { ResourceHarvest } from '../model/game/ResourceHarvest';
import { BuildingProductionController } from '../controller/BuildingProductionController';
import { RoadConstruction } from '../model/game/RoadConstruction';
import { OutpostController } from '../controller/OutpostController';

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
 * Particule animée pour représenter une ressource qui vole de l'hex vers l'inventaire.
 */
interface ResourceParticle {
  /** Position X actuelle */
  x: number;
  /** Position Y actuelle */
  y: number;
  /** Position X de départ */
  startX: number;
  /** Position Y de départ */
  startY: number;
  /** Position X de destination */
  endX: number;
  /** Position Y de destination */
  endY: number;
  /** Type de ressource (pour la couleur) */
  resourceType: ResourceType;
  /** Progression de l'animation (0 à 1) */
  progress: number;
  /** Temps de création en millisecondes */
  createdAt: number;
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
 * Renderer pour afficher une IslandMap sur un canvas HTML5.
 */
export class HexMapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private showCoordinates: boolean = false;
  private currentConfig: RenderConfig | null = null;
  private currentIslandMap: IslandMap | null = null;
  private onHexClickCallback: ((hexCoord: HexCoord) => void) | null = null;
  private onEdgeClickCallback: ((edge: Edge) => void) | null = null;
  private onVertexClickCallback: ((vertex: Vertex) => void) | null = null;
  /**
   * Callback appelé quand la sélection de ville (vertex) change.
   * Permet de mettre à jour la sidebar sans la recalc à chaque frame de rendu.
   */
  private onSelectionChangeCallback: ((selectedVertex: Vertex | null) => void) | null = null;
  private onOutpostVertexClickCallback: ((vertex: Vertex) => void) | null = null;
  private hoveredEdge: Edge | null = null;
  private hoveredVertex: Vertex | null = null;
  private hoveredOutpostVertex: Vertex | null = null;
  private selectedVertex: Vertex | null = null;
  private currentCivilizationId: CivilizationId | null = null;
  private renderCallback: (() => void) | null = null;
  /**
   * Callback appelé lors de changements d'assets (sprites/texture) pour permettre
   * de rafraîchir des éléments UI (ex: titre de ville avec sprite) sans coupler au rendu.
   */
  private assetsChangedCallback: (() => void) | null = null;
  private harvestedHexes: Map<string, number> = new Map(); // Map<hexCoord.hashCode(), timestamp>
  private citySprites: Map<CityLevel, HTMLImageElement> = new Map();
  private citySpritesLoaded: boolean = false;
  private hexTextures: Map<HexType, HTMLImageElement> = new Map();
  private hexTexturesLoaded: boolean = false;
  private lockSprite: HTMLImageElement | null = null;
  private lockSpriteLoaded: boolean = false;
  private resourceParticles: ResourceParticle[] = [];
  private animationFrameId: number | null = null;
  private cooldownAnimationFrameId: number | null = null;
  private tooltipElement: HTMLDivElement | null = null;
  private tooltipEdge: Edge | null = null;
  private tooltipOutpostVertex: Vertex | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Impossible d\'obtenir le contexte 2D du canvas');
    }
    this.ctx = context;
    this.setupMouseMoveHandler();
    this.setupTooltip();
    this.loadCitySprites();
    this.loadHexTextures();
    this.loadLockSprite();
  }

  /**
   * Charge les sprites SVG des villes.
   */
  private loadCitySprites(): void {
    // Le serveur sert les fichiers depuis la racine du projet
    // Les sprites sont accessibles via assets/sprites/ (chemins relatifs)

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
      if (loadedCount === totalSprites) {
        this.citySpritesLoaded = true;
        // Re-rendre si nécessaire pour mettre à jour la carte
        if (this.renderCallback) {
          this.renderCallback();
        }
        // Notifier l'UI (sidebar) une fois, sans dépendre des frames d'animation
        if (this.assetsChangedCallback) {
          this.assetsChangedCallback();
        }
      }
    };

    for (const [level, filename] of Object.entries(spriteFiles)) {
      const levelNum = Number(level) as CityLevel;
      
      const tryLoad = (): void => {
        const img = new Image();
        const fullPath = "assets/sprites/" + filename;
        
        img.onload = () => {
          this.citySprites.set(levelNum, img);
          checkAllLoaded();
        };
        
        img.onerror = () => {
          console.warn(`Échec du chargement avec ${fullPath}`);
          // Compter quand même pour ne pas bloquer
          checkAllLoaded();
        };
        
        img.src = fullPath;
      };

      tryLoad();
    }
  }

  /**
   * Charge le sprite SVG du cadenas.
   */
  private loadLockSprite(): void {
    const img = new Image();
    const fullPath = "assets/sprites/lock.svg";
    
    img.onload = () => {
      this.lockSprite = img;
      this.lockSpriteLoaded = true;
      // Re-rendre si nécessaire pour mettre à jour la carte
      if (this.renderCallback) {
        this.renderCallback();
      }
      if (this.assetsChangedCallback) {
        this.assetsChangedCallback();
      }
    };
    
    img.onerror = () => {
      console.warn(`Échec du chargement du sprite de cadenas ${fullPath}`);
    };
    
    img.src = fullPath;
  }


  /**
   * Charge les textures SVG des hexagones.
   */
  private loadHexTextures(): void {
    const textureFiles: Record<HexType, string> = {
      [HexType.Wood]: 'texture-wood.svg',
      [HexType.Brick]: 'texture-brick.svg',
      [HexType.Wheat]: 'texture-wheat.svg',
      [HexType.Sheep]: 'texture-sheep.svg',
      [HexType.Ore]: 'texture-ore.svg',
      [HexType.Desert]: 'texture-desert.svg',
      [HexType.Water]: 'texture-water.svg',
    };

    let loadedCount = 0;
    const totalTextures = Object.keys(textureFiles).length;

    const checkAllLoaded = (): void => {
      loadedCount++;
      if (loadedCount === totalTextures) {
        this.hexTexturesLoaded = true;
        // Re-rendre si nécessaire pour mettre à jour la carte
        if (this.renderCallback) {
          this.renderCallback();
        }
        if (this.assetsChangedCallback) {
          this.assetsChangedCallback();
        }
      }
    };

    for (const [hexType, filename] of Object.entries(textureFiles)) {
      const type = hexType as HexType;
      
      const tryLoad = (): void => {
        const img = new Image();
        const fullPath = "assets/textures/" + filename;
        
        img.onload = () => {
          this.hexTextures.set(type, img);
          checkAllLoaded();
        };
        
        img.onerror = () => {
          console.warn(`Échec du chargement de la texture ${fullPath}`);
          // Compter quand même pour ne pas bloquer
          checkAllLoaded();
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
   * @param islandMap - La carte à dessiner
   * @param civId - Optionnel: la civilisation pour laquelle dessiner les routes constructibles
   */
  render(islandMap: IslandMap, civId?: CivilizationId): void {
    // Stocker la civilisation actuelle pour la détection de survol
    this.currentCivilizationId = civId || null;
    // Effacer le canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculer les dimensions de la carte
    const grid = islandMap.getGrid();
    const allHexes = grid.getAllHexes();

    if (allHexes.length === 0) {
      return;
    }

    // Filtrer uniquement les hexagones visibles
    const visibleHexes = allHexes.filter(hex => islandMap.isHexVisible(hex.coord));

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
    this.currentIslandMap = islandMap;

    // Dessiner uniquement les hexagones visibles
    for (const hex of visibleHexes) {
      this.drawHex(hex, islandMap, config, civId);
    }

    // Dessiner les coordonnées si activé (uniquement pour les hexagones visibles)
    if (this.showCoordinates) {
      for (const hex of visibleHexes) {
        this.drawCoordinates(hex, config);
      }
    }

    // Dessiner les routes construites (avant les villes pour qu'elles passent sous)
    this.drawRoads(islandMap, config);

    // Dessiner les routes constructibles si une civilisation est fournie (avant les villes)
    if (civId) {
      this.drawBuildableRoads(islandMap, config, civId);
    }

    // Dessiner les avant-postes constructibles si une civilisation est fournie (avant les villes)
    if (civId) {
      this.drawBuildableOutposts(islandMap, config, civId);
    }

    // Dessiner les villes sur leurs sommets (en dernier pour qu'elles soient par-dessus les routes)
    this.drawCities(islandMap, config);

    // Dessiner les particules de ressources animées (par-dessus tout le reste)
    this.drawResourceParticles();
    
    // Vérifier s'il y a des cooldowns actifs et programmer un nouveau rendu si nécessaire
    this.scheduleCooldownAnimation(islandMap);
  }

  /**
   * Vérifie s'il y a des cooldowns actifs sur la carte et programme un nouveau rendu si nécessaire.
   * Cette méthode continue à programmer des frames jusqu'à ce qu'il n'y ait plus de cooldowns actifs.
   */
  private scheduleCooldownAnimation(islandMap: IslandMap): void {
    // Vérifier s'il y a des cooldowns actifs
    const grid = islandMap.getGrid();
    const allHexes = grid.getAllHexes();
    const visibleHexes = allHexes.filter(hex => islandMap.isHexVisible(hex.coord));
    
    const hasActiveCooldown = visibleHexes.some(hex => {
      const remainingCooldown = ResourceHarvestController.getRemainingCooldown(hex.coord);
      return remainingCooldown > 0;
    });
    
    if (hasActiveCooldown) {
      // Il y a des cooldowns actifs, programmer un nouveau rendu
      // Ne programmer qu'une seule fois pour éviter les multiples animations en parallèle
      if (this.cooldownAnimationFrameId === null) {
        const animate = () => {
          // Vérifier à nouveau s'il y a encore des cooldowns actifs en recalculant les hexagones visibles
          if (!this.currentIslandMap) {
            this.cooldownAnimationFrameId = null;
            return;
          }
          
          const currentGrid = this.currentIslandMap.getGrid();
          const currentAllHexes = currentGrid.getAllHexes();
          const currentVisibleHexes = currentAllHexes.filter(hex => this.currentIslandMap!.isHexVisible(hex.coord));
          
          // Toujours re-rendre avant de vérifier si on continue, pour mettre à jour les timers
          if (this.currentCivilizationId !== null) {
            if (this.renderCallback) {
              this.renderCallback();
            } else {
              this.render(this.currentIslandMap, this.currentCivilizationId);
            }
          }
          
          // Vérifier s'il y a encore des cooldowns actifs après le rendu
          const stillHasActiveCooldown = currentVisibleHexes.some(hex => {
            const remainingCooldown = ResourceHarvestController.getRemainingCooldown(hex.coord);
            return remainingCooldown > 0;
          });
          
          if (stillHasActiveCooldown) {
            // Programmer le prochain frame
            this.cooldownAnimationFrameId = requestAnimationFrame(animate);
          } else {
            // Plus de cooldowns actifs, arrêter l'animation
            // (le dernier rendu a déjà été fait juste avant)
            this.cooldownAnimationFrameId = null;
          }
        };
        this.cooldownAnimationFrameId = requestAnimationFrame(animate);
      }
    } else {
      // Plus de cooldowns actifs, annuler l'animation si elle existe
      if (this.cooldownAnimationFrameId !== null) {
        cancelAnimationFrame(this.cooldownAnimationFrameId);
        this.cooldownAnimationFrameId = null;
      }
    }
  }

  /**
   * Définit un callback à appeler pour re-rendre la carte.
   * Utilisé pour mettre à jour l'affichage lors du survol de la souris.
   */
  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  /**
   * Définit un callback à appeler quand la sélection de ville change (sélection/désélection).
   * Permet de mettre à jour le panneau latéral sans le re-rendre à chaque frame.
   */
  setOnSelectionChangeCallback(callback: (selectedVertex: Vertex | null) => void): void {
    this.onSelectionChangeCallback = callback;
  }

  /**
   * Définit un callback à appeler quand des assets du renderer deviennent disponibles.
   * Utile pour rafraîchir l'UI (ex: afficher les sprites dans le titre du panneau).
   */
  setAssetsChangedCallback(callback: () => void): void {
    this.assetsChangedCallback = callback;
  }

  /**
   * Retourne le vertex (ville) actuellement sélectionné, ou null si aucune ville n'est sélectionnée.
   * @returns Le vertex sélectionné ou null
   */
  getSelectedVertex(): Vertex | null {
    return this.selectedVertex;
  }

  /**
   * Retourne le sprite (image) d'une ville selon son niveau.
   * @param level - Le niveau de la ville
   * @returns L'image du sprite ou null si non chargé
   */
  getCitySprite(level: CityLevel): HTMLImageElement | null {
    return this.citySprites.get(level) || null;
  }

  /**
   * Vérifie si les sprites sont chargés.
   * @returns true si tous les sprites sont chargés
   */
  areCitySpritesLoaded(): boolean {
    return this.citySpritesLoaded;
  }

  /**
   * Déclenche un effet visuel pour indiquer qu'un hexagone a été récolté.
   * L'hexagone sera légèrement réduit pendant un court instant (uniquement pour les récoltes manuelles).
   * @param hexCoord - La coordonnée de l'hexagone récolté
   * @param isAutomatic - Si true, n'affiche pas l'effet de réduction de taille (seulement la particule)
   */
  triggerHarvestEffect(hexCoord: HexCoord, isAutomatic: boolean = false): void {
    // Pour les récoltes automatiques, ne pas appliquer l'effet de réduction de taille
    if (isAutomatic) {
      return;
    }

    const hexKey = hexCoord.hashCode();
    const now = Date.now();
    this.harvestedHexes.set(hexKey, now);

    // Re-rendre immédiatement pour afficher l'effet
    if (this.renderCallback) {
      this.renderCallback();
    }

    // Nettoyer après la durée de l'animation (100ms)
    setTimeout(() => {
      this.harvestedHexes.delete(hexKey);
      // Re-rendre pour revenir à la taille normale
      if (this.renderCallback) {
        this.renderCallback();
      }
    }, 100);
  }

  /**
   * Couleurs des ressources pour les particules d'animation.
   */
  private static readonly RESOURCE_COLORS: Record<ResourceType, string> = {
    [ResourceType.Wood]: '#8B4513',
    [ResourceType.Brick]: '#CD5C5C',
    [ResourceType.Wheat]: '#FFD700',
    [ResourceType.Sheep]: '#90EE90',
    [ResourceType.Ore]: '#708090',
  };

  /**
   * Déclenche une animation de particule pour représenter une ressource qui vole de l'hex vers la ville.
   * @param hexCoord - La coordonnée de l'hexagone récolté
   * @param resourceType - Le type de ressource récoltée
   * @param cityVertex - Le vertex (ville) vers lequel la particule doit voler
   */
  triggerResourceHarvestAnimation(hexCoord: HexCoord, resourceType: ResourceType, cityVertex: Vertex): void {
    if (!this.currentConfig || !this.currentIslandMap) {
      return;
    }

    // Calculer la position de départ (centre de l'hex)
    const { hexSize, offsetX, offsetY } = this.currentConfig;
    const startX = offsetX + Math.sqrt(3) * (hexCoord.q + hexCoord.r / 2) * hexSize;
    const startY = offsetY + (3 / 2) * hexCoord.r * hexSize;

    // Calculer la position de destination (position de la ville)
    const cityPosition = this.getVertexPosition(cityVertex, this.currentConfig);
    const endX = cityPosition.x;
    const endY = cityPosition.y;

    // Créer la particule
    const particle: ResourceParticle = {
      x: startX,
      y: startY,
      startX,
      startY,
      endX,
      endY,
      resourceType,
      progress: 0,
      createdAt: Date.now(),
    };

    this.resourceParticles.push(particle);

    // Démarrer l'animation si elle n'est pas déjà en cours
    if (this.animationFrameId === null) {
      this.animateParticles();
    }
  }

  /**
   * Déclenche une animation de particule pour le marché niveau 2 : la particule apparaît à la ville et monte vers le haut.
   * @param cityVertex - Le vertex (ville) où la particule apparaît
   * @param resourceType - Le type de ressource produite
   */
  triggerMarketProductionAnimation(cityVertex: Vertex, resourceType: ResourceType): void {
    if (!this.currentConfig || !this.currentIslandMap) {
      return;
    }

    // Calculer la position de départ (position de la ville)
    const cityPosition = this.getVertexPosition(cityVertex, this.currentConfig);
    const startX = cityPosition.x;
    const startY = cityPosition.y;

    // Calculer la position de destination (haut de l'hex, environ la hauteur d'un hex)
    // La hauteur d'un hex est 2 * hexSize, on monte d'environ la moitié de cette hauteur
    const { hexSize } = this.currentConfig;
    const endX = startX; // Même position X (monte verticalement)
    const endY = startY - hexSize; // Monte d'une hauteur d'hex

    // Créer la particule
    const particle: ResourceParticle = {
      x: startX,
      y: startY,
      startX,
      startY,
      endX,
      endY,
      resourceType,
      progress: 0,
      createdAt: Date.now(),
    };

    this.resourceParticles.push(particle);

    // Démarrer l'animation si elle n'est pas déjà en cours
    if (this.animationFrameId === null) {
      this.animateParticles();
    }
  }

  /**
   * Anime les particules de ressources en utilisant requestAnimationFrame.
   */
  private animateParticles(): void {
    const now = Date.now();
    const ANIMATION_DURATION_MS = 800; // Durée de l'animation en millisecondes
    const EASING_FUNCTION = (t: number): number => {
      // Fonction d'easing ease-out (commence vite, ralentit à la fin)
      return 1 - Math.pow(1 - t, 3);
    };

    // Mettre à jour les particules
    const activeParticles: ResourceParticle[] = [];
    const previousCount = this.resourceParticles.length;
    
    for (const particle of this.resourceParticles) {
      const elapsed = now - particle.createdAt;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      
      // Ne garder que les particules qui ne sont pas encore terminées
      if (progress < 1) {
        particle.progress = progress;
        // Calculer la position interpolée avec easing
        const easedProgress = EASING_FUNCTION(progress);
        particle.x = particle.startX + (particle.endX - particle.startX) * easedProgress;
        particle.y = particle.startY + (particle.endY - particle.startY) * easedProgress;
        activeParticles.push(particle);
      }
      // Les particules avec progress >= 1 sont automatiquement exclues (disparues)
    }

    const hasParticlesRemoved = activeParticles.length < previousCount;
    this.resourceParticles = activeParticles;

    // Toujours re-rendre si on a des particules actives ou si des particules viennent d'être supprimées
    if (this.resourceParticles.length > 0 || hasParticlesRemoved) {
      // Re-rendre la carte pour afficher les particules (ou nettoyer les particules supprimées)
      if (this.renderCallback) {
        this.renderCallback();
      }
    }

    // Continuer l'animation s'il reste des particules actives
    if (this.resourceParticles.length > 0) {
      this.animationFrameId = requestAnimationFrame(() => this.animateParticles());
    } else {
      // Arrêter l'animation si toutes les particules sont terminées
      this.animationFrameId = null;
    }
  }

  /**
   * Dessine les particules de ressources actives.
   */
  private drawResourceParticles(): void {
    for (const particle of this.resourceParticles) {
      // Ne dessiner que les particules qui ne sont pas encore terminées
      if (particle.progress >= 1) {
        continue;
      }
      
      const color = HexMapRenderer.RESOURCE_COLORS[particle.resourceType] || '#000000';
      const size = 8; // Taille de la particule
      
      // Dessiner un cercle coloré pour représenter la ressource
      this.ctx.save();
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Ajouter une bordure pour plus de visibilité
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      
      this.ctx.restore();
    }
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
  private drawHex(hex: Hex, islandMap: IslandMap, config: RenderConfig, civId?: CivilizationId): void {
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
    const hexType = islandMap.getHexType(coord) || HexType.Desert;
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

    // Remplir avec la texture si disponible, sinon utiliser la couleur
    const texture = this.hexTextures.get(hexType);
    if (texture && this.hexTexturesLoaded && texture.complete && texture.naturalWidth > 0) {
      // Créer un pattern répétable avec la texture
      // Ajuster la taille du pattern en fonction de la taille de l'hexagone
      const patternSize = Math.max(currentHexSize * 1.2, 32);
      const pattern = this.ctx.createPattern(texture, 'repeat');
      if (pattern) {
        // Sauvegarder le contexte pour appliquer la transformation du pattern
        this.ctx.save();
        
        // Créer un canvas temporaire pour redimensionner la texture si nécessaire
        // Note: createPattern utilise la taille originale de l'image, donc on peut
        // utiliser directement l'image ou créer un pattern plus petit
        this.ctx.fillStyle = pattern;
        this.ctx.fill();
        
        this.ctx.restore();
      } else {
        // Fallback: utiliser la couleur si le pattern n'a pas pu être créé
        this.ctx.fillStyle = color;
        this.ctx.fill();
      }
    } else {
      // Fallback: utiliser la couleur si la texture n'est pas disponible
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }

    // Dessiner le contour
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Dessiner le timer de cooldown si l'hex est en cooldown
    this.drawCooldownTimer(coord, x, y, currentHexSize);
    
    // Dessiner un cadenas si l'hex est terrestre mais non récoltable
    if (civId && hexType !== HexType.Water) {
      const isHarvestable = ResourceHarvest.canHarvest(coord, islandMap, civId);
      if (!isHarvestable) {
        this.drawLockIcon(x, y, currentHexSize);
      }
    }

    // Dessiner le texte "auto" si l'hex est récolté automatiquement
    if (civId && BuildingProductionController.isHexAutoHarvested(coord, civId, islandMap)) {
      this.drawAutoIcon(x, y, currentHexSize);
    }
  }

  /**
   * Dessine une icône de cadenas au centre d'un hexagone pour indiquer qu'il n'est pas récoltable.
   * Utilise le sprite SVG chargé depuis les assets.
   */
  private drawLockIcon(centerX: number, centerY: number, hexSize: number): void {
    // Si le sprite n'est pas encore chargé, ne rien dessiner
    if (!this.lockSprite || !this.lockSpriteLoaded) {
      return;
    }
    
    const iconSize = hexSize * 0.5; // Taille de l'icône proportionnelle à l'hexagone
    
    this.ctx.save();
    
    // Centrer l'image sur le point (centerX, centerY)
    // Largeur augmentée de 87.5% au total (1.5 * 1.25)
    const spriteWidth = iconSize * 1.875;
    const spriteHeight = iconSize;
    const x = centerX - spriteWidth / 2;
    const y = centerY - spriteHeight / 2;
    
    // Dessiner le sprite
    this.ctx.drawImage(this.lockSprite, x, y, spriteWidth, spriteHeight);
    
    this.ctx.restore();
  }

  /**
   * Dessine le texte "auto" au centre d'un hexagone pour indiquer qu'il est récolté automatiquement.
   */
  private drawAutoIcon(centerX: number, centerY: number, hexSize: number): void {
    this.ctx.save();
    
    const fontSize = hexSize * 0.25;
    const text = 'auto';
    
    // Configurer la police
    this.ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Dessiner le texte avec un contour pour améliorer la lisibilité
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.lineJoin = 'round';
    this.ctx.miterLimit = 2;
    this.ctx.strokeText(text, centerX, centerY);
    
    // Dessiner le texte en blanc
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(text, centerX, centerY);
    
    this.ctx.restore();
  }

  /**
   * Dessine un timer circulaire pour indiquer le temps restant avant de pouvoir récolter à nouveau.
   */
  private drawCooldownTimer(hexCoord: HexCoord, centerX: number, centerY: number, hexSize: number): void {
    const remainingCooldown = ResourceHarvestController.getRemainingCooldown(hexCoord);
    
    if (remainingCooldown <= 0) {
      return; // Pas de cooldown, ne rien afficher
    }

    const harvestIntervalMs = ResourceHarvestController.getHarvestIntervalMs();
    if (harvestIntervalMs <= 0) {
      return; // Sécurité (évite division par 0)
    }
    const progress = Math.min(1, remainingCooldown / harvestIntervalMs);
    
    // Taille du timer (cercle au centre de l'hex)
    const timerRadius = hexSize * 0.3;
    
    this.ctx.save();
    
    // Dessiner le fond du timer (cercle gris semi-transparent)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, timerRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Dessiner l'arc de progression (de 0 à progress * 2π)
    // L'arc commence en haut (-π/2) et tourne dans le sens horaire
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    const startAngle = -Math.PI / 2; // En haut
    const endAngle = startAngle + (1 - progress) * Math.PI * 2; // Progression du cooldown
    this.ctx.arc(centerX, centerY, timerRadius, startAngle, endAngle);
    this.ctx.stroke();
    
    // Afficher le temps restant en secondes au centre
    const remainingSeconds = Math.ceil(remainingCooldown / 1000);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `${Math.max(10, timerRadius * 0.5)}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(remainingSeconds.toString(), centerX, centerY);
    
    this.ctx.restore();
  }

  /**
   * Dessine les coordonnées (q, r) en haut d'un hexagone.
   */
  private drawCoordinates(hex: Hex, config: RenderConfig): void {
    const { hexSize, offsetX, offsetY } = config;
    const coord = hex.coord;

    // Convertir les coordonnées axiales en coordonnées pixel (centre de l'hexagone)
    const centerX = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
    const centerY = offsetY + (3 / 2) * coord.r * hexSize;

    // Positionner le texte en haut de l'hexagone (au-dessus du centre)
    // Pour un hexagone pointy-top, le haut est à environ -hexSize pixels du centre
    const textY = centerY - hexSize * 0.4; // Légèrement au-dessus du haut de l'hexagone

    // Dessiner le texte des coordonnées
    const text = `(${coord.q},${coord.r})`;
    const fontSize = Math.max(8, hexSize * 0.25);
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    // Dessiner un fond semi-transparent pour améliorer la lisibilité
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = parseInt(this.ctx.font) || 12;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillRect(
      centerX - textWidth / 2 - 2,
      textY - textHeight - 2,
      textWidth + 4,
      textHeight + 4
    );
    
    
    this.ctx.fillStyle = '#000000';
    this.ctx.fillText(text, centerX, textY);
  }

  /**
   * Dessine les villes sur leurs sommets.
   */
  private drawCities(islandMap: IslandMap, config: RenderConfig): void {
    const grid = islandMap.getGrid();
    const allHexes = grid.getAllHexes();

    
    const allVertices = grid.getAllVertices();
    for (const vertex of allVertices) {
      const vertexKey = vertex.hashCode();
      if (islandMap.hasCity(vertex)) {
        const city = islandMap.getCity(vertex);
        const isHovered = this.hoveredVertex !== null && this.hoveredVertex.equals(vertex);
        const isSelected = this.selectedVertex !== null && this.selectedVertex.equals(vertex);
        if (city) {
          this.drawCity(vertex, city, config, isHovered, isSelected);
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

    // Taille fixe pour toutes les villes (taille de la capitale)
    const baseSize = (8 + CityLevel.Capital * 2) * 2; // 32 pixels pour tous les niveaux
    
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
      // Appliquer la transformation pour le scale et la position
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(scale, scale);

      // Dessiner l'aura jaune autour du sprite pour améliorer le contraste
      const auraRadius = baseSize / 2 + 3; // Rayon de l'aura (légèrement plus grand que le sprite)
      const gradient = this.ctx.createRadialGradient(0, 0, baseSize / 2, 0, 0, auraRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 0, 0.0)'); // Transparent au centre
      gradient.addColorStop(0.7, 'rgba(255, 255, 200, 0.6)'); // Jaune clair
      gradient.addColorStop(1, 'rgba(255, 255, 0, 0.3)'); // Jaune plus foncé à l'extérieur
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Dessiner le sprite (après l'aura pour qu'il soit au-dessus)
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
  private drawRoads(islandMap: IslandMap, config: RenderConfig): void {
    const grid = islandMap.getGrid();
    const allEdges = grid.getAllEdges();

    // Utiliser un Set pour éviter de dessiner deux fois la même route
    const drawnEdges = new Set<string>();

    for (const edge of allEdges) {
      if (islandMap.hasRoad(edge)) {
        const edgeKey = edge.hashCode();
        if (!drawnEdges.has(edgeKey)) {
          drawnEdges.add(edgeKey);
          this.drawRoad(edge, config, false, islandMap); // false = trait plein
        }
      }
    }
  }

  /**
   * Dessine les routes constructibles pour une civilisation.
   */
  private drawBuildableRoads(
    islandMap: IslandMap,
    config: RenderConfig,
    civId: CivilizationId
  ): void {
    const buildableRoads = islandMap.getBuildableRoadsForCivilization(civId);

    for (const edge of buildableRoads) {
      const isHighlighted = this.hoveredEdge !== null && this.hoveredEdge.equals(edge);
      this.drawRoad(edge, config, true, islandMap, isHighlighted); // true = trait pointillé
    }
  }

  /**
   * Dessine les avant-postes constructibles pour une civilisation.
   */
  private drawBuildableOutposts(
    islandMap: IslandMap,
    config: RenderConfig,
    civId: CivilizationId
  ): void {
    const buildableVertices = islandMap.getBuildableOutpostVertices(civId);

    for (const vertex of buildableVertices) {
      const isHighlighted = this.hoveredOutpostVertex !== null && this.hoveredOutpostVertex.equals(vertex);
      this.drawBuildableOutpostVertex(vertex, config, isHighlighted);
    }
  }

  /**
   * Dessine un vertex constructible pour un avant-poste (rond en pointillé).
   * @param vertex - Le vertex à dessiner
   * @param config - La configuration de rendu
   * @param isHighlighted - true si le vertex est survolé
   */
  private drawBuildableOutpostVertex(vertex: Vertex, config: RenderConfig, isHighlighted: boolean = false): void {
    const { hexSize, offsetX, offsetY } = config;
    const hexes = vertex.getHexes();

    // Calculer la position du centre du vertex
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

    // Taille du cercle (deux fois plus petit que la ville)
    const baseRadius = 8; // Réduit de 16 à 8
    const radius = isHighlighted ? baseRadius * 1.3 : baseRadius;

    // Sauvegarder le contexte
    this.ctx.save();

    // Dessiner un cercle en pointillé
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    
    // Style du cercle pointillé
    this.ctx.strokeStyle = isHighlighted ? '#00FF00' : '#90EE90'; // Vert clair
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]); // Pointillé : 5px trait, 5px espace
    this.ctx.stroke();
    
    // Restaurer le contexte
    this.ctx.setLineDash([]); // Réinitialiser le pointillé
    this.ctx.restore();
  }

  /**
   * Dessine une route (construite ou constructible) sur une arête.
   * @param edge - L'arête à dessiner
   * @param config - La configuration de rendu
   * @param isDashed - true pour un trait pointillé (route constructible), false pour un trait plein (route construite)
   * @param isHighlighted - true pour mettre en surbrillance (route survolée)
   */
  private drawRoad(edge: Edge, config: RenderConfig, isDashed: boolean, islandMap: IslandMap, isHighlighted: boolean = false): void {
    const { hexSize, offsetX, offsetY } = config;
    const [hex1, hex2] = edge.getHexes();

    // Obtenir les vertices de l'edge (un edge a deux vertices)
    const vertices = islandMap.getVerticesForEdge(edge);
    
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
    // Ajuster la taille du canvas en fonction de son conteneur réel.
    // Depuis l'introduction de la sidebar fixe à droite, la largeur disponible dépend du layout.
    const container = this.canvas.parentElement as HTMLElement | null;
    if (!container) {
      // Fallback (ne devrait pas arriver) : conserver l'ancien comportement minimal
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      return;
    }

    const rect = container.getBoundingClientRect();

    // Éviter des tailles nulles lors d'un layout transitoire
    const width = Math.max(0, Math.floor(rect.width));
    const height = Math.max(0, Math.floor(rect.height));

    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Convertit les coordonnées pixel (x, y) en coordonnées hexagonales (q, r).
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @returns Les coordonnées hexagonales correspondantes, ou null si hors carte
   */
  pixelToHexCoord(pixelX: number, pixelY: number): HexCoord | null {
    if (!this.currentConfig || !this.currentIslandMap) {
      return null;
    }

    const { hexSize, offsetX, offsetY } = this.currentConfig;
    const grid = this.currentIslandMap.getGrid();

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
    if (!this.currentConfig || !this.currentIslandMap) {
      return null;
    }

    const islandMap = this.currentIslandMap;
    const grid = islandMap.getGrid();
    const allVertices = grid.getAllVertices();

    let closestVertex: Vertex | null = null;
    let minDistance = Infinity;
    const maxDistance = 12; // Distance maximale en pixels (taille de la ville + marge)

    for (const vertex of allVertices) {
      // Ne vérifier que les vertices qui ont une ville
      if (!islandMap.hasCity(vertex)) {
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
   * Convertit les coordonnées pixel (x, y) en Vertex (sommet) parmi tous les vertices.
   * Utilisé pour détecter les clics sur les vertices constructibles d'avant-postes.
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @param maxDistance - Distance maximale en pixels pour considérer qu'on a cliqué sur un sommet (défaut: 32)
   * @returns Le sommet le plus proche du point cliqué, ou null si aucun sommet n'est assez proche
   */
  pixelToVertexAny(pixelX: number, pixelY: number, maxDistance: number = 32): Vertex | null {
    if (!this.currentConfig || !this.currentIslandMap) {
      return null;
    }

    const islandMap = this.currentIslandMap;
    const grid = islandMap.getGrid();
    const allVertices = grid.getAllVertices();

    let closestVertex: Vertex | null = null;
    let minDistance = Infinity;

    for (const vertex of allVertices) {
      // Vérifier que tous les hexagones du vertex existent
      const vertexHexes = vertex.getHexes();
      const allVertexHexesExist = vertexHexes.every(h => grid.hasHex(h));
      if (!allVertexHexesExist) {
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
    if (!this.currentConfig || !this.currentIslandMap) {
      return null;
    }

    const islandMap = this.currentIslandMap;
    const grid = islandMap.getGrid();
    const allEdges = grid.getAllEdges();

    let closestEdge: Edge | null = null;
    let minDistance = Infinity;
    const maxDistance = 8; // Distance maximale en pixels pour considérer qu'on a cliqué sur une arête

    for (const edge of allEdges) {
      // Obtenir les vertices de l'edge
      const vertices = islandMap.getVerticesForEdge(edge);
      
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
   * Définit le callback à appeler lorsqu'un vertex constructible pour un avant-poste est cliqué.
   * @param callback - Fonction appelée avec le vertex cliqué
   */
  setOnOutpostVertexClick(callback: (vertex: Vertex) => void): void {
    this.onOutpostVertexClickCallback = callback;
    this.setupClickHandler();
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
   * Configure le tooltip pour afficher les informations des routes constructibles.
   */
  private setupTooltip(): void {
    // Créer l'élément tooltip s'il n'existe pas
    if (!this.tooltipElement) {
      this.tooltipElement = document.createElement('div');
      this.tooltipElement.className = 'road-tooltip';
      this.tooltipElement.style.cssText = `
        position: absolute;
        pointer-events: none;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        z-index: 1000;
        white-space: nowrap;
        display: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(this.tooltipElement);
    }
  }

  /**
   * Met à jour le tooltip avec les informations de coût d'une route constructible.
   */
  private updateTooltip(edge: Edge, event: MouseEvent): void {
    if (!this.tooltipElement || !this.currentIslandMap || !this.currentCivilizationId) {
      return;
    }

    // S'assurer que le tooltip d'avant-poste est masqué
    this.tooltipOutpostVertex = null;

    // Calculer la distance
    const distance = this.currentIslandMap.calculateBuildableRoadDistance(edge, this.currentCivilizationId);
    if (distance === undefined) {
      this.hideTooltip();
      return;
    }

    // Calculer le coût
    const cost = RoadConstruction.getCost(distance);
    const brickCost = cost.get(ResourceType.Brick) || 0;
    const woodCost = cost.get(ResourceType.Wood) || 0;

    // Mettre à jour le contenu
    this.tooltipElement.textContent = `${brickCost} Brique${brickCost > 1 ? 's' : ''}, ${woodCost} Bois (distance: ${distance})`;

    // Positionner le tooltip près du curseur
    this.tooltipElement.style.left = `${event.clientX + 15}px`;
    this.tooltipElement.style.top = `${event.clientY + 15}px`;
    this.tooltipElement.style.display = 'block';

    this.tooltipEdge = edge;
  }

  /**
   * Met à jour le tooltip avec les informations de coût d'un avant-poste constructible.
   */
  private updateOutpostTooltip(vertex: Vertex, event: MouseEvent): void {
    if (!this.tooltipElement || !this.currentIslandMap || !this.currentCivilizationId) {
      return;
    }

    // S'assurer que le tooltip de route est masqué
    this.tooltipEdge = null;

    // Calculer le coût
    const cityCount = this.currentIslandMap.getCityCount();
    const cost = OutpostController.getBuildableOutpostCost(cityCount);
    const woodCost = cost.get(ResourceType.Wood) || 0;
    const brickCost = cost.get(ResourceType.Brick) || 0;
    const wheatCost = cost.get(ResourceType.Wheat) || 0;
    const sheepCost = cost.get(ResourceType.Sheep) || 0;

    // Mettre à jour le contenu
    this.tooltipElement.textContent = 
      `${woodCost} Bois, ${brickCost} Brique, ${wheatCost} Blé, ${sheepCost} Mouton (${cityCount} ville${cityCount > 1 ? 's' : ''})`;

    // Positionner le tooltip près du curseur
    this.tooltipElement.style.left = `${event.clientX + 15}px`;
    this.tooltipElement.style.top = `${event.clientY + 15}px`;
    this.tooltipElement.style.display = 'block';

    this.tooltipOutpostVertex = vertex;
  }

  /**
   * Masque le tooltip.
   */
  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
      this.tooltipEdge = null;
      this.tooltipOutpostVertex = null;
    }
  }

  /**
   * Gestionnaire de mouvement de souris pour mettre en surbrillance les routes constructibles et les villes.
   */
  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.currentConfig || !this.currentIslandMap) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    
    // Calculer les coordonnées en tenant compte de l'échelle CSS si le canvas est redimensionné
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const pixelX = (event.clientX - rect.left) * scaleX;
    const pixelY = (event.clientY - rect.top) * scaleY;

    let needsRender = false;

    // PRIORITÉ 1: Vérifier d'abord si on survole une ville existante
    const vertex = this.pixelToVertex(pixelX, pixelY);
    if (vertex && this.currentIslandMap && this.currentIslandMap.hasCity(vertex)) {
      // On survole une ville existante
      if (!this.hoveredVertex || !this.hoveredVertex.equals(vertex)) {
        this.hoveredVertex = vertex;
        // Retirer la surbrillance des routes et avant-postes si on survole une ville
        if (this.hoveredEdge !== null) {
          this.hoveredEdge = null;
        }
        if (this.hoveredOutpostVertex !== null) {
          this.hoveredOutpostVertex = null;
        }
        // Masquer le tooltip
        this.hideTooltip();
        needsRender = true;
      }
    } else {
      // Pas de ville sur ce vertex, vérifier si c'est un avant-poste constructible
      if (this.currentCivilizationId) {
        // Utiliser pixelToVertexAny pour trouver tous les vertices
        const vertex = this.pixelToVertexAny(pixelX, pixelY, 16);
        if (vertex && !this.currentIslandMap.hasCity(vertex)) {
          const buildableOutposts = this.currentIslandMap.getBuildableOutpostVertices(this.currentCivilizationId);
          const isBuildableOutpost = buildableOutposts.some(buildableVertex => buildableVertex.equals(vertex));
          
          if (isBuildableOutpost) {
            if (!this.hoveredOutpostVertex || !this.hoveredOutpostVertex.equals(vertex)) {
              this.hoveredOutpostVertex = vertex;
              // Retirer la surbrillance des routes si on survole un avant-poste
              if (this.hoveredEdge !== null) {
                this.hoveredEdge = null;
              }
              needsRender = true;
            }
            // Afficher le tooltip avec le coût
            this.updateOutpostTooltip(vertex, event);
          } else {
            // Vertex non constructible, retirer la surbrillance
            if (this.hoveredOutpostVertex !== null) {
              this.hoveredOutpostVertex = null;
              needsRender = true;
            }
            // Vérifier les routes constructibles
            const edge = this.pixelToEdge(pixelX, pixelY);
            
            if (edge) {
              const buildableRoads = this.currentIslandMap.getBuildableRoadsForCivilization(this.currentCivilizationId);
              const isBuildable = buildableRoads.some(buildableEdge => buildableEdge.equals(edge));
              
              if (isBuildable) {
                if (!this.hoveredEdge || !this.hoveredEdge.equals(edge)) {
                  this.hoveredEdge = edge;
                  needsRender = true;
                }
                // Afficher le tooltip avec le coût
                this.updateTooltip(edge, event);
              } else {
                // Route non constructible, retirer la surbrillance
                if (this.hoveredEdge !== null) {
                  this.hoveredEdge = null;
                  needsRender = true;
                }
                // Masquer le tooltip
                this.hideTooltip();
              }
            } else {
              // Pas d'arête constructible, retirer la surbrillance
              if (this.hoveredEdge !== null) {
                this.hoveredEdge = null;
                needsRender = true;
              }
              // Masquer le tooltip
              this.hideTooltip();
            }
          }
        } else {
          // Pas de vertex trouvé, vérifier les routes constructibles
          const edge = this.pixelToEdge(pixelX, pixelY);
          
          if (edge) {
            const buildableRoads = this.currentIslandMap.getBuildableRoadsForCivilization(this.currentCivilizationId);
            const isBuildable = buildableRoads.some(buildableEdge => buildableEdge.equals(edge));
            
            if (isBuildable) {
              if (!this.hoveredEdge || !this.hoveredEdge.equals(edge)) {
                this.hoveredEdge = edge;
                needsRender = true;
              }
              // Afficher le tooltip avec le coût
              this.updateTooltip(edge, event);
            } else {
              // Route non constructible, retirer la surbrillance
              if (this.hoveredEdge !== null) {
                this.hoveredEdge = null;
                needsRender = true;
              }
              // Masquer le tooltip
              this.hideTooltip();
            }
          } else {
            // Pas d'arête constructible, retirer la surbrillance
            if (this.hoveredEdge !== null) {
              this.hoveredEdge = null;
              needsRender = true;
            }
            // Masquer le tooltip
            this.hideTooltip();
          }
        }
      }
      
      // Retirer la surbrillance de la ville si on ne survole plus
      if (this.hoveredVertex !== null) {
        this.hoveredVertex = null;
        needsRender = true;
      }
      
      // Si on n'a pas trouvé d'avant-poste constructible, vérifier les routes constructibles
      if (this.hoveredOutpostVertex === null && this.currentCivilizationId) {
        const edge = this.pixelToEdge(pixelX, pixelY);
        
        if (edge) {
          const buildableRoads = this.currentIslandMap.getBuildableRoadsForCivilization(this.currentCivilizationId);
          const isBuildable = buildableRoads.some(buildableEdge => buildableEdge.equals(edge));
          
          if (isBuildable) {
            if (!this.hoveredEdge || !this.hoveredEdge.equals(edge)) {
              this.hoveredEdge = edge;
              needsRender = true;
            }
            // Afficher le tooltip avec le coût
            this.updateTooltip(edge, event);
          } else {
            // Route non constructible, retirer la surbrillance
            if (this.hoveredEdge !== null) {
              this.hoveredEdge = null;
              needsRender = true;
            }
            // Masquer le tooltip
            this.hideTooltip();
          }
        } else {
          // Pas d'arête constructible, retirer la surbrillance
          if (this.hoveredEdge !== null) {
            this.hoveredEdge = null;
            needsRender = true;
          }
          // Masquer le tooltip
          this.hideTooltip();
        }
      }

      // Retirer la surbrillance de la ville et des avant-postes si on ne survole plus
      if (this.hoveredVertex !== null) {
        this.hoveredVertex = null;
        needsRender = true;
      }
      if (this.hoveredOutpostVertex !== null) {
        this.hoveredOutpostVertex = null;
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

    if (this.hoveredOutpostVertex !== null) {
      this.hoveredOutpostVertex = null;
      needsRender = true;
    }

    // Masquer le tooltip
    this.hideTooltip();

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
    if (vertex && this.currentIslandMap && this.currentIslandMap.hasCity(vertex)) {
      const previousSelection = this.selectedVertex;
      // Sélectionner/désélectionner la ville
      if (this.selectedVertex && this.selectedVertex.equals(vertex)) {
        // Désélectionner si on reclique sur la même ville
        this.selectedVertex = null;
      } else {
        // Sélectionner la nouvelle ville
        this.selectedVertex = vertex;
      }

      // Notifier si la sélection a changé
      const selectionChanged =
        (previousSelection === null && this.selectedVertex !== null) ||
        (previousSelection !== null && this.selectedVertex === null) ||
        (previousSelection !== null && this.selectedVertex !== null && !previousSelection.equals(this.selectedVertex));
      if (selectionChanged && this.onSelectionChangeCallback) {
        this.onSelectionChangeCallback(this.selectedVertex);
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

    // PRIORITÉ 2: Vérifier si on a cliqué sur un vertex constructible pour un avant-poste
    if (this.onOutpostVertexClickCallback && this.currentCivilizationId) {
      // Utiliser pixelToVertexAny pour trouver tous les vertices, pas seulement ceux avec une ville
      // Utiliser une distance maximale de 16 pixels (2x le rayon de base de 8)
      const vertexOutpost = this.pixelToVertexAny(pixelX, pixelY, 16);
      if (vertexOutpost && this.currentIslandMap) {
        // Vérifier que ce vertex n'a pas déjà une ville
        if (!this.currentIslandMap.hasCity(vertexOutpost)) {
          const buildableOutposts = this.currentIslandMap.getBuildableOutpostVertices(this.currentCivilizationId);
          const isBuildableOutpost = buildableOutposts.some(buildableVertex => buildableVertex.equals(vertexOutpost));
          
          if (isBuildableOutpost) {
            this.onOutpostVertexClickCallback(vertexOutpost);
            return; // Ne pas vérifier les edges ni les hexagones si on a cliqué sur un avant-poste
          }
        }
      }
    }

    // PRIORITÉ 3: Vérifier si on a cliqué sur un edge
    let edgeClicked = false;
    if (this.onEdgeClickCallback) {
      const edge = this.pixelToEdge(pixelX, pixelY);
      if (edge) {
        this.onEdgeClickCallback(edge);
        edgeClicked = true;
        // Ne pas retourner tout de suite, on veut désélectionner si une action a lieu
      }
    }

    // PRIORITÉ 4: Vérifier si on a cliqué sur un hexagone
    let hexClicked = false;
    if (this.onHexClickCallback) {
      const hexCoord = this.pixelToHexCoord(pixelX, pixelY);
      if (hexCoord && this.currentIslandMap && this.currentCivilizationId) {
        // Bloquer les clics sur les hexes automatiquement récoltés
        if (!BuildingProductionController.isHexAutoHarvested(hexCoord, this.currentCivilizationId, this.currentIslandMap)) {
          this.onHexClickCallback(hexCoord);
          hexClicked = true;
        }
      }
    }

    // Si on a cliqué sur un edge ou un hexagone interactif, on ne désélectionne pas la ville
    // Sinon si on clique sur du vide, on désélectionne
    if (!edgeClicked && !hexClicked && this.selectedVertex !== null) {
      this.selectedVertex = null;
      if (this.onSelectionChangeCallback) {
        this.onSelectionChangeCallback(null);
      }
      if (this.renderCallback) {
        this.renderCallback();
      }
    }
  };
}
