import { City } from '../model/city/City';
import { CityLevel } from '../model/city/CityLevel';
import { BuildingType, getBuildingTypeName, getBuildingAction, BUILDING_ACTION_NAMES, BuildingAction } from '../model/city/BuildingType';
import { ResourceType } from '../model/map/ResourceType';
import { Vertex } from '../model/hex/Vertex';
import { GameMap } from '../model/map/GameMap';
import { PlayerResources } from '../model/game/PlayerResources';
import { BuildingController } from '../controller/BuildingController';
import { HexMapRenderer } from './HexMapRenderer';

/**
 * Callbacks pour les actions du panneau de ville.
 */
export interface CityPanelCallbacks {
  /** Callback appelé lorsqu'un bâtiment doit être construit */
  onBuildBuilding?: (buildingType: BuildingType, city: City, gameMap: GameMap, vertex: Vertex) => void;
  /** Callback appelé lors d'une action sur un bâtiment construit */
  onBuildingAction?: (action: BuildingAction, buildingType: BuildingType, city: City) => void;
}

/**
 * Vue pour le panneau d'affichage des détails d'une ville.
 * Gère l'affichage des informations de la ville, des bâtiments constructibles et construits,
 * et des actions disponibles.
 */
export class CityPanelView {
  private cityPanel: HTMLElement;
  private cityPanelTitle: HTMLHeadingElement;
  private cityBuildingsList: HTMLUListElement;
  private cityBuildingsTitle: HTMLHeadingElement;
  private callbacks: CityPanelCallbacks = {};
  private renderer: HexMapRenderer | null = null;

  constructor(cityPanelId: string = 'city-panel') {
    const panel = document.getElementById(cityPanelId);
    const title = document.getElementById('city-panel-title') as HTMLHeadingElement;
    const buildingsList = document.getElementById('city-buildings-list') as HTMLUListElement;
    const buildingsTitle = document.querySelector('#city-buildings-section h3') as HTMLHeadingElement;

    if (!panel) {
      throw new Error(`Élément avec l'id "${cityPanelId}" introuvable`);
    }
    if (!title) {
      throw new Error('Élément avec l\'id "city-panel-title" introuvable');
    }
    if (!buildingsList) {
      throw new Error('Élément avec l\'id "city-buildings-list" introuvable');
    }
    if (!buildingsTitle) {
      throw new Error('Titre "Bâtiments" introuvable');
    }

    this.cityPanel = panel;
    this.cityPanelTitle = title;
    this.cityBuildingsList = buildingsList;
    this.cityBuildingsTitle = buildingsTitle;

    // Configurer les gestionnaires d'événements
    this.setupEventListeners();
  }

  /**
   * Configure le renderer pour obtenir les sprites des villes.
   */
  setRenderer(renderer: HexMapRenderer): void {
    this.renderer = renderer;
  }

  /**
   * Définit les callbacks pour les actions du panneau.
   */
  setCallbacks(callbacks: CityPanelCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Configure les gestionnaires d'événements pour les boutons.
   */
  private setupEventListeners(): void {
    // Utiliser la délégation d'événements pour gérer les boutons créés dynamiquement
    this.cityBuildingsList.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Gérer les boutons de construction
      if (target.classList.contains('build-btn')) {
        const button = target as HTMLButtonElement;
        if (button.disabled) {
          return;
        }
        const buildingType = button.dataset.buildingType as BuildingType;
        if (!buildingType) {
          return;
        }

        // Émettre un événement personnalisé
        const event = new CustomEvent('buildBuilding', {
          detail: { buildingType },
          bubbles: true,
        });
        this.cityPanel.dispatchEvent(event);
      }

      // Gérer les actions des bâtiments construits (Améliorer, Commerce)
      if (target.classList.contains('building-action-btn')) {
        const button = target as HTMLButtonElement;
        if (button.disabled) {
          return;
        }

        const buildingAction = button.dataset.buildingAction as BuildingAction;
        const buildingType = button.dataset.buildingType as BuildingType;
        if (!buildingAction || !buildingType) {
          return;
        }

        // Émettre un événement personnalisé
        const event = new CustomEvent('buildingAction', {
          detail: { buildingAction, buildingType },
          bubbles: true,
        });
        this.cityPanel.dispatchEvent(event);
      }
    });
  }

  /**
   * Retourne l'élément DOM du panneau pour permettre l'écoute d'événements personnalisés.
   */
  getPanelElement(): HTMLElement {
    return this.cityPanel;
  }

  /**
   * Met à jour l'affichage du panneau de la ville sélectionnée.
   */
  update(
    selectedVertex: Vertex | null,
    gameMap: GameMap | null,
    city: City | null,
    playerResources: PlayerResources
  ): void {
    if (!selectedVertex || !gameMap || !city) {
      // Masquer le panneau si aucune ville n'est sélectionnée
      this.cityPanel.classList.add('hidden');
      return;
    }

    // Afficher le panneau (l'animation CSS gère la transition)
    this.cityPanel.classList.remove('hidden');

    // Noms des niveaux de ville en français
    const cityLevelNames: Record<CityLevel, string> = {
      [CityLevel.Outpost]: 'Avant-poste',
      [CityLevel.Colony]: 'Colonie',
      [CityLevel.Town]: 'Ville',
      [CityLevel.Metropolis]: 'Métropole',
      [CityLevel.Capital]: 'Capitale',
    };

    // Mettre à jour le titre avec le sprite
    const levelName = cityLevelNames[city.level] || `Niveau ${city.level}`;

    // Vider le titre
    this.cityPanelTitle.innerHTML = '';

    // Ajouter le sprite si disponible
    if (this.renderer) {
      const sprite = this.renderer.getCitySprite(city.level);
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const spriteImg = document.createElement('img');
        spriteImg.src = sprite.src;
        spriteImg.style.width = '32px';
        spriteImg.style.height = '32px';
        spriteImg.style.marginRight = '8px';
        spriteImg.style.verticalAlign = 'middle';
        spriteImg.style.display = 'inline-block';
        spriteImg.alt = levelName;
        this.cityPanelTitle.appendChild(spriteImg);
      }
    }

    // Ajouter le nom de la ville
    const nameSpan = document.createElement('span');
    nameSpan.textContent = levelName;
    this.cityPanelTitle.appendChild(nameSpan);

    // Mettre à jour la liste des bâtiments
    this.updateBuildingsList(city, gameMap, selectedVertex, playerResources);
  }

  /**
   * Met à jour la liste des bâtiments dans le panneau.
   */
  private updateBuildingsList(city: City, gameMap: GameMap, vertex: Vertex, playerResources: PlayerResources): void {
    // Mettre à jour le titre avec le nombre de bâtiments construits / maximum
    const buildingCount = city.getBuildingCount();
    const maxBuildings = city.getMaxBuildings();
    this.cityBuildingsTitle.textContent = `Bâtiments ${buildingCount}/${maxBuildings}`;

    this.cityBuildingsList.innerHTML = '';

    // Noms des ressources en français pour l'affichage
    const resourceNames: Record<ResourceType, string> = {
      [ResourceType.Wood]: 'Bois',
      [ResourceType.Brick]: 'Brique',
      [ResourceType.Wheat]: 'Blé',
      [ResourceType.Sheep]: 'Mouton',
      [ResourceType.Ore]: 'Minerai',
    };

    // Obtenir les bâtiments constructibles avec leur statut
    const buildableBuildings = BuildingController.getBuildableBuildingsWithStatus(city, gameMap, vertex, playerResources);

    // Afficher d'abord les bâtiments constructibles
    for (const buildingStatus of buildableBuildings) {
      const item = document.createElement('li');
      item.className = 'buildable-building';

      // Conteneur pour le nom et le coût
      const infoContainer = document.createElement('div');
      infoContainer.className = 'building-info';

      // Nom du bâtiment
      const nameSpan = document.createElement('span');
      nameSpan.className = 'building-name';
      nameSpan.textContent = getBuildingTypeName(buildingStatus.buildingType);
      infoContainer.appendChild(nameSpan);

      // Coût affiché en dessous en plus petit
      const costSpan = document.createElement('span');
      costSpan.className = 'building-cost';
      const costParts: string[] = [];
      for (const [resource, amount] of buildingStatus.cost.entries()) {
        costParts.push(`${amount} ${resourceNames[resource]}`);
      }
      costSpan.textContent = costParts.join(', ');
      infoContainer.appendChild(costSpan);

      item.appendChild(infoContainer);

      // Bouton de construction
      const buildBtn = document.createElement('button');
      buildBtn.className = 'build-btn';
      buildBtn.textContent = 'Construire';
      buildBtn.disabled = !buildingStatus.canBuild;

      // Stocker le buildingType dans le bouton pour le gestionnaire d'événement
      buildBtn.dataset.buildingType = buildingStatus.buildingType;

      item.appendChild(buildBtn);
      this.cityBuildingsList.appendChild(item);
    }

    // Afficher ensuite les bâtiments déjà construits
    const buildings = city.getBuildings();
    if (buildings.length > 0) {
      for (const buildingType of buildings) {
        const item = document.createElement('li');
        item.className = 'built-building';

        // Conteneur pour le nom
        const infoContainer = document.createElement('div');
        infoContainer.className = 'building-info';

        // Nom du bâtiment
        const nameSpan = document.createElement('span');
        nameSpan.className = 'building-name';
        nameSpan.textContent = getBuildingTypeName(buildingType);
        infoContainer.appendChild(nameSpan);

        item.appendChild(infoContainer);

        // Bouton d'action si le bâtiment en a une
        const buildingAction = getBuildingAction(buildingType);
        if (buildingAction !== null) {
          const actionBtn = document.createElement('button');
          actionBtn.className = 'building-action-btn';
          actionBtn.textContent = BUILDING_ACTION_NAMES[buildingAction];

          // Désactiver le bouton d'amélioration si la ville ne peut pas être améliorée
          if (buildingAction === BuildingAction.Upgrade) {
            actionBtn.disabled = !city.canUpgrade();
          } else {
            // Pour l'instant, le bouton Trade est toujours activé (à implémenter plus tard)
            actionBtn.disabled = false;
          }

          // Stocker l'action et le type de bâtiment dans le bouton
          actionBtn.dataset.buildingAction = buildingAction;
          actionBtn.dataset.buildingType = buildingType;

          item.appendChild(actionBtn);
        }

        this.cityBuildingsList.appendChild(item);
      }
    }

    // Si aucun bâtiment constructible et aucun construit
    if (buildableBuildings.length === 0 && buildings.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'empty';
      emptyItem.textContent = 'Aucun bâtiment disponible';
      this.cityBuildingsList.appendChild(emptyItem);
    }
  }
}
