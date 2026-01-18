import { ResourceType } from '../model/map/ResourceType';

/**
 * Gestionnaire pour charger et stocker les sprites de ressources.
 */
export class ResourceSprites {
  private resourceSprites: Map<ResourceType, HTMLImageElement> = new Map();
  private loadedCount: number = 0;
  private totalSprites: number = 5; // Nombre de types de ressources
  private onAllLoadedCallback: (() => void) | null = null;

  /**
   * Charge tous les sprites de ressources.
   */
  load(): void {
    const spriteFiles: Record<ResourceType, string> = {
      [ResourceType.Wood]: 'resource-wood.svg',
      [ResourceType.Brick]: 'resource-brick.svg',
      [ResourceType.Wheat]: 'resource-wheat.svg',
      [ResourceType.Sheep]: 'resource-sheep.svg',
      [ResourceType.Ore]: 'resource-ore.svg',
    };

    const checkAllLoaded = (): void => {
      this.loadedCount++;
      if (this.loadedCount === this.totalSprites) {
        if (this.onAllLoadedCallback) {
          this.onAllLoadedCallback();
        }
      }
    };

    for (const [resourceType, filename] of Object.entries(spriteFiles)) {
      const type = resourceType as ResourceType;
      const img = new Image();
      const fullPath = `/assets/sprites/${filename}`;

      img.onload = () => {
        this.resourceSprites.set(type, img);
        checkAllLoaded();
      };

      img.onerror = () => {
        console.warn(`Échec du chargement du sprite de ressource ${fullPath}`);
        checkAllLoaded();
      };

      img.src = fullPath;
    }
  }

  /**
   * Retourne le sprite d'une ressource, ou null s'il n'est pas encore chargé.
   */
  getSprite(resourceType: ResourceType): HTMLImageElement | null {
    return this.resourceSprites.get(resourceType) || null;
  }

  /**
   * Vérifie si un sprite est chargé et prêt à être utilisé.
   */
  isSpriteReady(resourceType: ResourceType): boolean {
    const sprite = this.resourceSprites.get(resourceType);
    return sprite !== undefined && sprite.complete && sprite.naturalWidth > 0;
  }

  /**
   * Définit un callback appelé lorsque tous les sprites sont chargés.
   */
  onAllLoaded(callback: () => void): void {
    this.onAllLoadedCallback = callback;
  }
}
