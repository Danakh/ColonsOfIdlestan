import { City } from '../model/city/City';
import { CityLevel } from '../model/city/CityLevel';
import { BuildingType, getBuildingTypeName, getBuildingAction, BUILDING_ACTION_NAMES, BuildingAction, getAllBuildingTypes } from '../model/city/BuildingType';
import { ResourceType } from '../model/map/ResourceType';
import { Vertex } from '../model/hex/Vertex';
import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { PlayerResources } from '../model/game/PlayerResources';
import { BuildingController } from '../controller/BuildingController';
import { TradeController } from '../controller/TradeController';
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
  private tradeBtn: HTMLButtonElement | null = null;
  private callbacks: CityPanelCallbacks = {};
  private renderer: HexMapRenderer | null = null;
  private playerCivId: CivilizationId | null = null;
  private lastTradeKey: string | null = null;
  
  // Cache de l'état précédent pour éviter les rendus inutiles
  private lastSelectedVertexHash: string | null = null;
  private lastNoSelectionRendered: boolean = false;
  private lastResourcesHash: string | null = null;
  private lastCityBuildings: string[] | null = null;
  private lastCityLevel: CityLevel | null = null;

  constructor(cityPanelId: string = 'city-panel') {
    const panel = document.getElementById(cityPanelId);
    const title = document.getElementById('city-panel-title') as HTMLHeadingElement;
    const buildingsList = document.getElementById('city-buildings-list') as HTMLUListElement;
    const buildingsTitle = document.querySelector('#city-buildings-section h3') as HTMLHeadingElement;
    const tradeBtn = document.getElementById('city-trade-btn') as HTMLButtonElement;

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
    this.tradeBtn = tradeBtn ?? null;

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
   * Définit la civilisation du joueur pour activer/désactiver le bouton Commerce global.
   */
  setPlayerCivilizationId(civId: CivilizationId): void {
    this.playerCivId = civId;
  }

  /**
   * Traite un événement de construction de bâtiment.
   * @param buildingType - Le type de bâtiment à construire
   * @param city - La ville
   * @param gameMap - La carte de jeu
   * @param vertex - Le sommet de la ville
   */
  handleBuildBuilding(buildingType: BuildingType, city: City, gameMap: GameMap, vertex: Vertex): void {
    if (this.callbacks.onBuildBuilding) {
      this.callbacks.onBuildBuilding(buildingType, city, gameMap, vertex);
    }
  }

  /**
   * Traite un événement d'action sur un bâtiment.
   * @param action - L'action à effectuer
   * @param buildingType - Le type de bâtiment
   * @param city - La ville
   */
  handleBuildingAction(action: BuildingAction, buildingType: BuildingType, city: City): void {
    if (this.callbacks.onBuildingAction) {
      this.callbacks.onBuildingAction(action, buildingType, city);
    }
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

    // Bouton Commerce global (footer du panneau)
    if (this.tradeBtn) {
      this.tradeBtn.addEventListener('click', () => {
        if (this.tradeBtn?.disabled) {
          return;
        }
        const event = new CustomEvent('openTrade', {
          bubbles: true,
        });
        this.cityPanel.dispatchEvent(event);
      });
    }
  }

  /**
   * Met à jour le bouton Commerce global (footer). Retourne true si l'état a changé.
   */
  private updateTradeFooter(gameMap: GameMap | null): boolean {
    if (!this.tradeBtn) {
      return false;
    }

    const canTrade = Boolean(gameMap && this.playerCivId && TradeController.canTrade(this.playerCivId, gameMap));
    const rate = (canTrade && gameMap && this.playerCivId)
      ? TradeController.getTradeRateForCivilization(this.playerCivId, gameMap)
      : null;

    const tradeKey = canTrade ? `1:${rate}` : '0';
    if (tradeKey === this.lastTradeKey) {
      return false;
    }
    this.lastTradeKey = tradeKey;

    // Le bouton doit être caché tant que le commerce n'est pas disponible (l'espace est réservé par le footer).
    this.tradeBtn.hidden = !canTrade;
    this.tradeBtn.disabled = !canTrade;
    if (canTrade && rate) {
      this.tradeBtn.textContent = `Commerce (${rate}:1)`;
      this.tradeBtn.title = `Échanger au taux ${rate}:1.`;
    }

    return true;
  }

  /**
   * Retourne l'élément DOM du panneau pour permettre l'écoute d'événements personnalisés.
   */
  getPanelElement(): HTMLElement {
    return this.cityPanel;
  }

  /**
   * Met à jour l'affichage du panneau de la ville sélectionnée.
   * Évite le rendu si la ville sélectionnée et les ressources n'ont pas changé.
   */
  update(
    selectedVertex: Vertex | null,
    gameMap: GameMap | null,
    city: City | null,
    playerResources: PlayerResources
  ): void {
    const tradeChanged = this.updateTradeFooter(gameMap);

    if (!selectedVertex || !gameMap || !city) {
      // Sidebar fixe : afficher un état "aucune sélection" au lieu de masquer.
      if (this.lastNoSelectionRendered && !tradeChanged) {
        return;
      }

      this.cityPanel.classList.remove('hidden');
      this.cityPanelTitle.textContent = 'Aucune ville sélectionnée';
      this.cityBuildingsTitle.textContent = 'Bâtiments';
      this.cityBuildingsList.innerHTML = '';

      const emptyItem = document.createElement('li');
      emptyItem.className = 'empty';
      emptyItem.textContent = 'Sélectionnez une ville sur la carte pour afficher ses détails.';
      this.cityBuildingsList.appendChild(emptyItem);

      // Réinitialiser le cache lié à une ville
      this.lastSelectedVertexHash = null;
      this.lastResourcesHash = null;
      this.lastCityBuildings = null;
      this.lastCityLevel = null;
      this.lastNoSelectionRendered = true;
      return;
    }

    // Calculer les hash pour comparer avec l'état précédent
    const currentVertexHash = selectedVertex.hashCode();
    const currentResourcesHash = this.getResourcesHash(playerResources);
    // Inclure les niveaux pour détecter les upgrades (sinon la liste de types ne change pas)
    const currentCityBuildings = [...city.getBuildings()]
      .sort()
      .map((bt) => `${bt}:${city.getBuildingLevel(bt) ?? 0}`);
    const currentCityLevel = city.level;

    // Vérifier si quelque chose a changé
    // Si le cache est null, c'est le premier affichage, donc on doit rendre
    const isFirstRender = this.lastSelectedVertexHash === null;
    const vertexChanged = this.lastSelectedVertexHash !== currentVertexHash;
    const resourcesChanged = this.lastResourcesHash !== currentResourcesHash;
    const buildingsChanged = !this.arraysEqual(this.lastCityBuildings, currentCityBuildings);
    const levelChanged = this.lastCityLevel !== currentCityLevel;

    const hasChanged =
      isFirstRender ||
      vertexChanged ||
      resourcesChanged ||
      buildingsChanged ||
      levelChanged;

    // Si rien n'a changé, éviter le rendu
    if (!hasChanged) {
      return;
    }

    // Mettre à jour le cache
    this.lastSelectedVertexHash = currentVertexHash;
    this.lastResourcesHash = currentResourcesHash;
    this.lastCityBuildings = currentCityBuildings;
    this.lastCityLevel = currentCityLevel;
    this.lastNoSelectionRendered = false;

    // Sidebar fixe : toujours visible quand une ville est sélectionnée
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
   * Affiche tous les bâtiments dans un ordre fixe, sans séparer les constructibles des construits.
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

    // Obtenir tous les bâtiments possibles dans un ordre fixe
    const allBuildingTypes = getAllBuildingTypes();
    const builtBuildings = new Set(city.getBuildings());

    // Obtenir les bâtiments constructibles avec leur statut pour vérifier si on peut les construire
    const buildableBuildingsMap = new Map<BuildingType, { canBuild: boolean; blockedByBuildingLimit: boolean; cost: Map<ResourceType, number> }>();
    const buildableBuildings = BuildingController.getBuildableBuildingsWithStatus(city, gameMap, vertex, playerResources);
    for (const status of buildableBuildings) {
      buildableBuildingsMap.set(status.buildingType, { canBuild: status.canBuild, blockedByBuildingLimit: status.blockedByBuildingLimit, cost: status.cost });
    }

    // Afficher tous les bâtiments dans l'ordre fixe (seulement ceux qui sont construits ou constructibles)
    for (const buildingType of allBuildingTypes) {
      const isBuilt = builtBuildings.has(buildingType);
      const buildableStatus = buildableBuildingsMap.get(buildingType);

      // Ne pas afficher les bâtiments qui ne sont ni construits ni constructibles
      if (!isBuilt && !buildableStatus) {
        continue;
      }

      const item = document.createElement('li');
      item.className = isBuilt ? 'built-building' : 'buildable-building';

      // Conteneur pour le nom et le coût
      const infoContainer = document.createElement('div');
      infoContainer.className = 'building-info';

      // Nom du bâtiment
      const nameSpan = document.createElement('span');
      nameSpan.className = 'building-name';
      if (isBuilt) {
        const building = city.getBuilding(buildingType);
        const lvl = building?.level ?? 1;
        nameSpan.textContent = `${getBuildingTypeName(buildingType)} (Niv. ${lvl})`;
      } else {
        nameSpan.textContent = getBuildingTypeName(buildingType);
      }
      infoContainer.appendChild(nameSpan);

      // Si le bâtiment n'est pas construit et est constructible, afficher le coût
      if (!isBuilt && buildableStatus) {
        const costSpan = document.createElement('span');
        costSpan.className = 'building-cost';
        const costParts: string[] = [];
        for (const [resource, amount] of buildableStatus.cost.entries()) {
          costParts.push(`${amount} ${resourceNames[resource]}`);
        }
        costSpan.textContent = costParts.join(', ');
        infoContainer.appendChild(costSpan);
      }

      item.appendChild(infoContainer);

      // Si le bâtiment est construit, afficher les boutons d'action
      if (isBuilt) {
        const building = city.getBuilding(buildingType);
        const canUpgrade = Boolean(building && building.canUpgrade());

        // Afficher le coût d'amélioration comme les coûts de construction (si améliorable)
        if (building && canUpgrade) {
          const upgradeCost = building.getUpgradeCost();
          const costSpan = document.createElement('span');
          costSpan.className = 'building-cost';
          const costParts: string[] = [];
          for (const [resource, amount] of upgradeCost.entries()) {
            costParts.push(`${amount} ${resourceNames[resource]}`);
          }
          costSpan.textContent = `${costParts.join(', ')}`;
          infoContainer.appendChild(costSpan);
        }

        // Bouton Commerce si applicable
        const buildingAction = getBuildingAction(buildingType);
        if (buildingAction === BuildingAction.Trade) {
          const actionBtn = document.createElement('button');
          actionBtn.className = 'building-action-btn';
          actionBtn.textContent = BUILDING_ACTION_NAMES[buildingAction];
          actionBtn.disabled = false;
          actionBtn.dataset.buildingAction = buildingAction;
          actionBtn.dataset.buildingType = buildingType;
          item.appendChild(actionBtn);
        }

        // Bouton Améliorer uniquement si le bâtiment n'est pas au niveau max
        if (canUpgrade) {
          const upgradeBtn = document.createElement('button');
          upgradeBtn.className = 'building-action-btn';
          upgradeBtn.textContent = BUILDING_ACTION_NAMES[BuildingAction.Upgrade];
          upgradeBtn.disabled = false;
          upgradeBtn.dataset.buildingAction = BuildingAction.Upgrade;
          upgradeBtn.dataset.buildingType = buildingType;
          item.appendChild(upgradeBtn);
        }
      } else {
        // Si le bâtiment n'est pas construit, afficher le bouton de construction s'il est constructible
        if (buildableStatus) {
          const buildBtn = document.createElement('button');
          buildBtn.className = 'build-btn';
          buildBtn.textContent = 'Construire';
          // Désactiver uniquement si bloqué par la limite de bâtiments
          // (les autres raisons ne doivent pas griser le bouton)
          buildBtn.disabled = buildableStatus.blockedByBuildingLimit;

          // Stocker le buildingType dans le bouton pour le gestionnaire d'événement
          buildBtn.dataset.buildingType = buildingType;

          item.appendChild(buildBtn);
        }
      }

      this.cityBuildingsList.appendChild(item);
    }
  }

  /**
   * Génère un hash des ressources pour la comparaison.
   */
  private getResourcesHash(playerResources: PlayerResources): string {
    const resources = playerResources.getAllResources();
    const parts: string[] = [];
    for (const [resource, amount] of resources.entries()) {
      parts.push(`${resource}:${amount}`);
    }
    return parts.sort().join(',');
  }

  /**
   * Compare deux tableaux pour l'égalité.
   */
  private arraysEqual<T>(a: T[] | null, b: T[] | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
