import { ResourceType } from '../model/map/ResourceType';
import { PlayerResources } from '../model/game/PlayerResources';
import { ResourceSprites } from './ResourceSprites';
import { TradeController } from '../controller/TradeController';
import { IslandMap } from '../model/map/IslandMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { BuildingType } from '../model/city/BuildingType';
import { City } from '../model/city/City';
import { Vertex } from '../model/hex/Vertex';
import { Building } from '../model/city/Building';
import { t } from '../i18n';

/**
 * Callbacks pour les actions du panneau de commerce.
 */
export interface TradePanelCallbacks {
  /** Callback appelé lorsqu'un échange doit être effectué */
  onTrade?: (offered: Map<ResourceType, number>, requested: Map<ResourceType, number>) => void;
  /** Callback appelé lorsque l'utilisateur annule */
  onCancel?: () => void;
  /** Callback appelé lorsqu'un port change son état d'auto-trade */
  onPortAutoTradeChange?: (city: City, vertex: Vertex, enabled: boolean) => void;
}

/**
 * Vue pour le panneau de commerce.
 * Permet de composer un échange en sélectionnant les ressources données et reçues.
 */
export class TradePanelView {
  private tradePanel: HTMLElement;
  private offeredList: HTMLUListElement;
  private requestedList: HTMLUListElement;
  private portsList: HTMLUListElement;
  private cancelBtn: HTMLButtonElement;
  private confirmBtn: HTMLButtonElement;
  private offeredTitle: HTMLElement;
  private requestedTitle: HTMLElement;
  
  private offeredResources: Map<ResourceType, number> = new Map();
  private requestedResources: Map<ResourceType, number> = new Map();
  private playerResources: PlayerResources | null = null;
  private resourceSprites: ResourceSprites | null = null;
  private callbacks: TradePanelCallbacks = {};
  private islandMap: IslandMap | null = null;
  private civId: CivilizationId | null = null;

  // Noms des ressources en français
  private readonly resourceNames: Record<ResourceType, string> = {
    [ResourceType.Wood]: t('resource.wood'),
    [ResourceType.Brick]: t('resource.brick'),
    [ResourceType.Wheat]: t('resource.wheat'),
    [ResourceType.Sheep]: t('resource.sheep'),
    [ResourceType.Ore]: t('resource.ore'),
  };

  // Ordre d'affichage des ressources
  private readonly resourceOrder: ResourceType[] = [
    ResourceType.Wood,
    ResourceType.Brick,
    ResourceType.Wheat,
    ResourceType.Sheep,
    ResourceType.Ore,
  ];

  constructor(tradePanelId: string = 'trade-panel') {
    const panel = document.getElementById(tradePanelId);
    const offeredListEl = document.getElementById('trade-offered-list') as HTMLUListElement;
    const requestedListEl = document.getElementById('trade-requested-list') as HTMLUListElement;
    const portsListEl = document.getElementById('trade-ports-list') as HTMLUListElement;
    const cancelBtnEl = document.getElementById('trade-cancel-btn') as HTMLButtonElement;
    const confirmBtnEl = document.getElementById('trade-confirm-btn') as HTMLButtonElement;
    const offeredTitleEl = document.querySelector('.trade-column:first-child h3') as HTMLElement;
    const requestedTitleEl = document.querySelector('.trade-column:last-child h3') as HTMLElement;

    if (!panel) {
      throw new Error(t('error.elementNotFound', { id: tradePanelId }));
    }
    if (!offeredListEl) {
      throw new Error(t('error.elementNotFound', { id: 'trade-offered-list' }));
    }
    if (!requestedListEl) {
      throw new Error(t('error.elementNotFound', { id: 'trade-requested-list' }));
    }
    if (!portsListEl) {
      throw new Error(t('error.elementNotFound', { id: 'trade-ports-list' }));
    }
    if (!cancelBtnEl) {
      throw new Error(t('error.elementNotFound', { id: 'trade-cancel-btn' }));
    }
    if (!confirmBtnEl) {
      throw new Error(t('error.elementNotFound', { id: 'trade-confirm-btn' }));
    }
    if (!offeredTitleEl) {
      throw new Error(t('error.elementNotFound', { id: 'trade-offered-title' }));
    }
    if (!requestedTitleEl) {
      throw new Error(t('error.elementNotFound', { id: 'trade-requested-title' }));
    }

    this.tradePanel = panel;
    this.offeredList = offeredListEl;
    this.requestedList = requestedListEl;
    this.portsList = portsListEl;
    this.cancelBtn = cancelBtnEl;
    this.confirmBtn = confirmBtnEl;
    this.offeredTitle = offeredTitleEl;
    this.requestedTitle = requestedTitleEl;

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
  setCallbacks(callbacks: TradePanelCallbacks): void {
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

    // Bouton Échanger
    this.confirmBtn.addEventListener('click', () => {
      if (this.callbacks.onTrade) {
        this.callbacks.onTrade(
          new Map(this.offeredResources),
          new Map(this.requestedResources)
        );
      }
    });

    // Touche Escape pour fermer le panneau
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.tradePanel.classList.contains('hidden')) {
        this.hide();
        if (this.callbacks.onCancel) {
          this.callbacks.onCancel();
        }
      }
    });
  }

  /**
   * Configure la carte de jeu et la civilisation pour vérifier l'accès au commerce.
   */
  setGameContext(islandMap: IslandMap, civId: CivilizationId): void {
    this.islandMap = islandMap;
    this.civId = civId;
  }

  /**
   * Affiche le panneau de commerce et initialise les listes.
   */
  show(playerResources: PlayerResources): void {
    this.playerResources = playerResources;
    this.offeredResources.clear();
    this.requestedResources.clear();
    
    // Initialiser toutes les ressources à 0
    for (const resourceType of this.resourceOrder) {
      this.offeredResources.set(resourceType, 0);
      this.requestedResources.set(resourceType, 0);
    }

    this.update();
    this.tradePanel.classList.remove('hidden');
  }

  /**
   * Cache le panneau de commerce.
   */
  hide(): void {
    this.tradePanel.classList.add('hidden');
    this.offeredResources.clear();
    this.requestedResources.clear();
  }

  /**
   * Met à jour l'affichage des listes et du bouton Échanger.
   */
  private update(): void {
    if (!this.playerResources) {
      return;
    }

    // Mettre à jour la liste des ports
    this.updatePortsList();

    // Mettre à jour la liste des ressources offertes (gauche)
    this.updateResourceList(this.offeredList, this.offeredResources, true);

    // Mettre à jour la liste des ressources demandées (droite)
    this.updateResourceList(this.requestedList, this.requestedResources, false);

    // Mettre à jour les titres avec le nombre de batches
    this.updateTitles();

    // Mettre à jour le bouton Échanger
    this.updateConfirmButton();
  }

  /**
   * Met à jour une liste de ressources.
   */
  private updateResourceList(
    listElement: HTMLUListElement,
    resourceMap: Map<ResourceType, number>,
    isOffered: boolean
  ): void {
    listElement.innerHTML = '';

    for (const resourceType of this.resourceOrder) {
      const quantity = resourceMap.get(resourceType) || 0;
      const available = this.playerResources?.getResource(resourceType) || 0;

      const item = document.createElement('li');
      item.className = 'trade-resource-item';
      
      // Pour la liste offerte, désactiver visuellement si on n'a pas assez pour un échange minimum
      if (isOffered) {
        const rate = (this.civId && this.islandMap)
          ? TradeController.getTradeRateForResource(this.civId, this.islandMap, resourceType)
          : 4;
        if (available < rate) {
          item.classList.add('disabled');
        }
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

      // Quantité
      const quantitySpan = document.createElement('span');
      quantitySpan.className = 'trade-resource-quantity';
      quantitySpan.textContent = quantity > 0 ? `×${quantity}` : '';
      item.appendChild(quantitySpan);

      // Gestionnaires de clic (gauche et droit)
      if (!item.classList.contains('disabled')) {
        if (isOffered) {
          // Clic gauche : ajouter un batch (Ctrl: 10, Shift: 100)
          item.addEventListener('click', (e) => {
            this.handleOfferedClick(resourceType, e);
          });
          // Clic droit : retirer un batch (Ctrl: 10, Shift: 100)
          item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleOfferedRightClick(resourceType, e);
          });
        } else {
          // Clic gauche : ajouter une ressource (Ctrl: 10, Shift: 100)
          item.addEventListener('click', (e) => {
            this.handleRequestedClick(resourceType, e);
          });
          // Clic droit : retirer une ressource (Ctrl: 10, Shift: 100)
          item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleRequestedRightClick(resourceType, e);
          });
        }
      }

      listElement.appendChild(item);
    }
  }

  /**
   * Gère le clic sur une ressource dans la liste des ressources offertes.
   */
  private handleOfferedClick(resourceType: ResourceType, event: MouseEvent): void {
    if (!this.playerResources) {
      return;
    }

    const rate = (this.civId && this.islandMap)
      ? TradeController.getTradeRateForResource(this.civId, this.islandMap, resourceType)
      : 4;
    
    // Déterminer le nombre de batches à ajouter selon les modificateurs
    let batchesToAdd = 1;
    if (event.ctrlKey) {
      batchesToAdd = 10;
    } else if (event.shiftKey) {
      batchesToAdd = 100;
    }
    
    const current = this.offeredResources.get(resourceType) || 0;
    const available = this.playerResources.getResource(resourceType);
    const quantityToAdd = batchesToAdd * rate;
    const newQuantity = current + quantityToAdd;

    // Vérifier qu'on ne dépasse pas les ressources disponibles
    if (newQuantity <= available) {
      this.offeredResources.set(resourceType, newQuantity);
      this.update();
    } else {
      // Si on dépasse, ajouter le maximum possible
      const maxPossible = Math.floor(available / rate) * rate;
      if (maxPossible > current) {
        this.offeredResources.set(resourceType, maxPossible);
        this.update();
      }
    }
  }

  /**
   * Gère le clic sur une ressource dans la liste des ressources demandées.
   */
  private handleRequestedClick(resourceType: ResourceType, event: MouseEvent): void {
    // Déterminer le nombre de batches à ajouter selon les modificateurs
    let batchesToAdd = 1;
    if (event.ctrlKey) {
      batchesToAdd = 10;
    } else if (event.shiftKey) {
      batchesToAdd = 100;
    }
    
    const current = this.requestedResources.get(resourceType) || 0;
    this.requestedResources.set(resourceType, current + batchesToAdd);
    this.update();
  }

  /**
   * Gère le clic droit sur une ressource dans la liste des ressources offertes (retire un batch).
   */
  private handleOfferedRightClick(resourceType: ResourceType, event: MouseEvent): void {
    const current = this.offeredResources.get(resourceType) || 0;
    if (current > 0) {
      const rate = (this.civId && this.islandMap)
        ? TradeController.getTradeRateForResource(this.civId, this.islandMap, resourceType)
        : 4;
      
      // Déterminer le nombre de batches à retirer selon les modificateurs
      let batchesToRemove = 1;
      if (event.ctrlKey) {
        batchesToRemove = 10;
      } else if (event.shiftKey) {
        batchesToRemove = 100;
      }
      
      const quantityToRemove = batchesToRemove * rate;
      const newQuantity = Math.max(0, current - quantityToRemove);
      this.offeredResources.set(resourceType, newQuantity);
      this.update();
    }
  }

  /**
   * Gère le clic droit sur une ressource dans la liste des ressources demandées (retire une unité).
   */
  private handleRequestedRightClick(resourceType: ResourceType, event: MouseEvent): void {
    const current = this.requestedResources.get(resourceType) || 0;
    if (current > 0) {
      // Déterminer le nombre de batches à retirer selon les modificateurs
      let batchesToRemove = 1;
      if (event.ctrlKey) {
        batchesToRemove = 10;
      } else if (event.shiftKey) {
        batchesToRemove = 100;
      }
      
      const newQuantity = Math.max(0, current - batchesToRemove);
      this.requestedResources.set(resourceType, newQuantity);
      this.update();
    }
  }

  /**
   * Calcule le nombre total de batches offerts.
   */
  private getOfferedBatches(): number {
    if (!this.civId || !this.islandMap) {
      return 0;
    }
    let totalBatches = 0;
    for (const [resourceType, quantity] of this.offeredResources.entries()) {
      if (quantity > 0) {
        const rate = TradeController.getTradeRateForResource(this.civId, this.islandMap, resourceType);
        totalBatches += quantity / rate;
      }
    }
    return totalBatches;
  }

  /**
   * Calcule le nombre total de batches demandés (1 ressource = 1 batch).
   */
  private getRequestedBatches(): number {
    let totalBatches = 0;
    for (const quantity of this.requestedResources.values()) {
      totalBatches += quantity;
    }
    return totalBatches;
  }

  /**
   * Met à jour les titres avec le nombre de batches.
   */
  private updateTitles(): void {
    const offeredBatches = this.getOfferedBatches();
    const requestedBatches = this.getRequestedBatches();

    this.offeredTitle.textContent = offeredBatches > 0 
      ? `Vous donnez (${offeredBatches})`
      : 'Vous donnez';
    
    this.requestedTitle.textContent = requestedBatches > 0
      ? `Vous recevez (${requestedBatches})`
      : 'Vous recevez';
  }

  /**
   * Met à jour l'état du bouton Échanger.
   */
  private updateConfirmButton(): void {
    // Calculer le nombre de batches des deux côtés
    const offeredBatches = this.getOfferedBatches();
    const requestedBatches = this.getRequestedBatches();

    // Vérifier que le nombre de batches est égal des deux côtés
    const batchesMatch = offeredBatches > 0 && requestedBatches > 0 && offeredBatches === requestedBatches;

    // Vérifier l'accès au commerce
    let canTrade = true;
    if (this.islandMap && this.civId) {
      canTrade = TradeController.canTrade(this.civId, this.islandMap);
    }

    // Vérifier que le joueur a assez de ressources pour toutes les offres
    let hasEnoughResources = true;
    if (this.playerResources) {
      for (const [resourceType, quantity] of this.offeredResources.entries()) {
        if (quantity > 0 && !this.playerResources.hasEnough(resourceType, quantity)) {
          hasEnoughResources = false;
          break;
        }
      }
    }

    // Le bouton est désactivé si les batches ne correspondent pas, si le commerce n'est pas disponible,
    // ou si le joueur n'a pas assez de ressources
    this.confirmBtn.disabled = !batchesMatch || !canTrade || !hasEnoughResources;
  }

  /**
   * Met à jour la liste des ports niveau 3 avec leurs cases à cocher pour l'auto-trade.
   * Crée une case à cocher pour chaque ressource dans l'ordre, alignée avec les ressources dans "Vous donnez".
   */
  private updatePortsList(): void {
    this.portsList.innerHTML = '';

    if (!this.islandMap || !this.civId) {
      // Créer des items vides pour chaque ressource pour maintenir l'alignement
      for (const resourceType of this.resourceOrder) {
        const item = document.createElement('li');
        item.className = 'trade-port-item';
        this.portsList.appendChild(item);
      }
      return;
    }

    // Récupérer toutes les villes de la civilisation avec des ports niveau 3
    const cities = this.islandMap.getCitiesByCivilization(this.civId);
    const portsByResource: Map<ResourceType, { city: City; vertex: Vertex; seaport: Building }> = new Map();

    for (const city of cities) {
      const seaport = city.getBuilding(BuildingType.Seaport);
      if (seaport && seaport.level === 3) {
        const specialization = seaport.getSpecialization();
        if (specialization) {
          // Si plusieurs ports ont la même spécialisation, on garde le premier
          if (!portsByResource.has(specialization)) {
            portsByResource.set(specialization, { city, vertex: city.vertex, seaport });
          }
        }
      }
    }

    // Créer une case à cocher pour chaque ressource dans l'ordre
    for (const resourceType of this.resourceOrder) {
      const item = document.createElement('li');
      item.className = 'trade-port-item';

      const portInfo = portsByResource.get(resourceType);
      
      if (portInfo) {
        // Créer une case à cocher pour ce port
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `port-auto-trade-${portInfo.vertex.hashCode()}`;
        checkbox.className = 'trade-port-checkbox';
        checkbox.checked = portInfo.seaport.isAutoTradeEnabled();
        checkbox.dataset.vertexHash = portInfo.vertex.hashCode();
        checkbox.dataset.resourceType = resourceType;

        // Gestionnaire de changement
        checkbox.addEventListener('change', () => {
          if (this.callbacks.onPortAutoTradeChange) {
            this.callbacks.onPortAutoTradeChange(portInfo.city, portInfo.vertex, checkbox.checked);
          }
        });

        item.appendChild(checkbox);
      }
      // Si pas de port pour cette ressource, item vide pour maintenir l'alignement

      this.portsList.appendChild(item);
    }
  }
}
