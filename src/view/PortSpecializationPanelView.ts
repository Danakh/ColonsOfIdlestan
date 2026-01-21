import { ResourceType } from '../model/map/ResourceType';
import { ResourceSprites } from './ResourceSprites';

/**
 * Callbacks pour les actions du panneau de spécialisation du port.
 */
export interface PortSpecializationPanelCallbacks {
  /** Callback appelé lorsqu'une ressource est sélectionnée pour la spécialisation */
  onSelectResource?: (resource: ResourceType) => void;
  /** Callback appelé lorsque l'utilisateur annule */
  onCancel?: () => void;
}

/**
 * Vue pour le panneau de spécialisation du port.
 * Permet de choisir une ressource à spécialiser pour le port niveau 2.
 */
export class PortSpecializationPanelView {
  private panel: HTMLElement;
  private resourceList: HTMLUListElement;
  private cancelBtn: HTMLButtonElement;
  private confirmBtn: HTMLButtonElement;
  
  private selectedResource: ResourceType | null = null;
  private resourceSprites: ResourceSprites | null = null;
  private callbacks: PortSpecializationPanelCallbacks = {};

  // Noms des ressources en français
  private readonly resourceNames: Record<ResourceType, string> = {
    [ResourceType.Wood]: 'Bois',
    [ResourceType.Brick]: 'Brique',
    [ResourceType.Wheat]: 'Blé',
    [ResourceType.Sheep]: 'Mouton',
    [ResourceType.Ore]: 'Minerai',
  };

  // Ordre d'affichage des ressources
  private readonly resourceOrder: ResourceType[] = [
    ResourceType.Wood,
    ResourceType.Brick,
    ResourceType.Wheat,
    ResourceType.Sheep,
    ResourceType.Ore,
  ];

  constructor(panelId: string = 'port-specialization-panel') {
    const panelEl = document.getElementById(panelId);
    const resourceListEl = document.getElementById('port-specialization-list') as HTMLUListElement;
    const cancelBtnEl = document.getElementById('port-specialization-cancel-btn') as HTMLButtonElement;
    const confirmBtnEl = document.getElementById('port-specialization-confirm-btn') as HTMLButtonElement;

    if (!panelEl) {
      throw new Error(`Élément avec l'id "${panelId}" introuvable`);
    }
    if (!resourceListEl) {
      throw new Error('Élément avec l\'id "port-specialization-list" introuvable');
    }
    if (!cancelBtnEl) {
      throw new Error('Élément avec l\'id "port-specialization-cancel-btn" introuvable');
    }
    if (!confirmBtnEl) {
      throw new Error('Élément avec l\'id "port-specialization-confirm-btn" introuvable');
    }

    this.panel = panelEl;
    this.resourceList = resourceListEl;
    this.cancelBtn = cancelBtnEl;
    this.confirmBtn = confirmBtnEl;

    // Configurer les gestionnaires d'événements
    this.setupEventListeners();
  }

  /**
   * Configure le gestionnaire de sprites de ressources.
   */
  setResourceSprites(resourceSprites: ResourceSprites): void {
    this.resourceSprites = resourceSprites;
  }

  /**
   * Définit les callbacks pour les actions du panneau.
   */
  setCallbacks(callbacks: PortSpecializationPanelCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Configure les gestionnaires d'événements.
   */
  private setupEventListeners(): void {
    // Bouton Annuler
    this.cancelBtn.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onCancel) {
        this.callbacks.onCancel();
      }
    });

    // Bouton Confirmer
    this.confirmBtn.addEventListener('click', () => {
      if (this.selectedResource && this.callbacks.onSelectResource) {
        this.callbacks.onSelectResource(this.selectedResource);
      }
    });

    // Touche Escape pour fermer le panneau
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.panel.classList.contains('hidden')) {
        this.hide();
        if (this.callbacks.onCancel) {
          this.callbacks.onCancel();
        }
      }
    });
  }

  /**
   * Affiche le panneau de spécialisation et initialise la liste.
   */
  show(): void {
    this.selectedResource = null;
    this.update();
    this.panel.classList.remove('hidden');
  }

  /**
   * Cache le panneau de spécialisation.
   */
  hide(): void {
    this.panel.classList.add('hidden');
    this.selectedResource = null;
  }

  /**
   * Met à jour l'affichage de la liste des ressources et du bouton de confirmation.
   */
  private update(): void {
    // Mettre à jour la liste des ressources
    this.updateResourceList();

    // Mettre à jour le bouton Confirmer
    this.confirmBtn.disabled = this.selectedResource === null;
  }

  /**
   * Met à jour la liste des ressources.
   */
  private updateResourceList(): void {
    this.resourceList.innerHTML = '';

    for (const resourceType of this.resourceOrder) {
      const item = document.createElement('li');
      item.className = 'port-specialization-resource-item';
      
      if (this.selectedResource === resourceType) {
        item.classList.add('selected');
      }

      // Conteneur pour le sprite et le nom
      const resourceInfo = document.createElement('div');
      resourceInfo.className = 'trade-resource-info';

      // Sprite de ressource
      if (this.resourceSprites) {
        const sprite = this.resourceSprites.getSprite(resourceType);
        const spriteReady = this.resourceSprites.isSpriteReady(resourceType);
        
        if (spriteReady && sprite) {
          const spriteImg = document.createElement('img');
          spriteImg.src = sprite.src;
          spriteImg.className = 'trade-resource-sprite';
          spriteImg.alt = this.resourceNames[resourceType];
          spriteImg.style.width = '32px';
          spriteImg.style.height = '32px';
          spriteImg.style.objectFit = 'contain';
          resourceInfo.appendChild(spriteImg);
        } else {
          // Fallback : carré de couleur
          const color = document.createElement('div');
          color.className = 'trade-resource-color';
          const resourceColors: Record<ResourceType, string> = {
            [ResourceType.Wood]: '#8B4513',
            [ResourceType.Brick]: '#CD5C5C',
            [ResourceType.Wheat]: '#FFD700',
            [ResourceType.Sheep]: '#90EE90',
            [ResourceType.Ore]: '#708090',
          };
          color.style.backgroundColor = resourceColors[resourceType];
          resourceInfo.appendChild(color);
        }
      }

      // Nom de la ressource
      const nameSpan = document.createElement('span');
      nameSpan.className = 'trade-resource-name';
      nameSpan.textContent = this.resourceNames[resourceType];
      resourceInfo.appendChild(nameSpan);

      item.appendChild(resourceInfo);

      // Gestionnaire de clic pour sélectionner la ressource
      item.addEventListener('click', () => {
        this.selectedResource = resourceType;
        this.update();
      });

      this.resourceList.appendChild(item);
    }
  }
}
