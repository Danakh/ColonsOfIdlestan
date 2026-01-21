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
 * Source de vérité minimale pour permettre au panneau de se rendre tout seul.
 * Évite de dupliquer la logique "selectedVertex + city + resources" dans main.ts.
 */
export interface CityPanelStateProvider {
  getGameMap: () => GameMap | null;
  getPlayerResources: () => PlayerResources;
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

  private stateProvider: CityPanelStateProvider | null = null;
  private pendingScheduledUpdate: boolean = false;
  
  // Cache de l'état précédent pour éviter les rendus inutiles
  private lastSelectedVertexHash: string | null = null;
  private lastNoSelectionRendered: boolean = false;
  private lastResourcesHash: string | null = null;
  /** Liste des types de bâtiments construits (structure) */
  private lastCityBuildings: string[] | null = null;
  /** Niveau de la ville (structure) */
  private lastCityLevel: CityLevel | null = null;
  /** Niveaux des bâtiments construits (dynamique) */
  private lastCityBuildingLevelsKey: string | null = null;

  // Noms des ressources en français pour l'affichage (centralisé)
  private static readonly RESOURCE_NAMES: Record<ResourceType, string> = {
    [ResourceType.Wood]: 'Bois',
    [ResourceType.Brick]: 'Brique',
    [ResourceType.Wheat]: 'Blé',
    [ResourceType.Sheep]: 'Mouton',
    [ResourceType.Ore]: 'Minerai',
  };

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
   * Connecte le panneau à un renderer + un provider d'état.
   * Le panneau se mettra à jour automatiquement quand la sélection change, et pourra
   * être rafraîchi à la demande quand les ressources changent.
   */
  bind(renderer: HexMapRenderer, stateProvider: CityPanelStateProvider): void {
    this.setRenderer(renderer);
    this.stateProvider = stateProvider;

    // La sélection change: c'est un événement "rare" → update immédiat.
    renderer.setOnSelectionChangeCallback(() => {
      this.refreshNow();
    });

    // Assets prêts (sprites/texture): rafraîchir en coalesçant pour éviter du DOM churn.
    renderer.setAssetsChangedCallback(() => {
      this.scheduleRefresh();
    });
  }

  /**
   * Demande un rafraîchissement du panneau (coalescé sur une frame).
   * À appeler quand les ressources changent (récolte auto, trade, cheat, etc.).
   */
  scheduleRefresh(): void {
    if (this.pendingScheduledUpdate) {
      return;
    }
    this.pendingScheduledUpdate = true;
    requestAnimationFrame(() => {
      this.pendingScheduledUpdate = false;
      this.refreshNow();
    });
  }

  /**
   * Rafraîchit le panneau immédiatement depuis le renderer + provider (si bind()).
   */
  refreshNow(): void {
    if (!this.renderer || !this.stateProvider) {
      return;
    }

    const selectedVertex = this.renderer.getSelectedVertex();
    const gameMap = this.stateProvider.getGameMap();
    const city =
      selectedVertex && gameMap && gameMap.hasCity(selectedVertex)
        ? gameMap.getCity(selectedVertex) || null
        : null;
    const playerResources = this.stateProvider.getPlayerResources();

    this.update(selectedVertex, gameMap, city, playerResources);
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
      this.lastCityBuildingLevelsKey = null;
      this.lastNoSelectionRendered = true;
      return;
    }

    // Calculer les hash pour comparer avec l'état précédent
    const currentVertexHash = selectedVertex.hashCode();
    const currentResourcesHash = this.getResourcesHash(playerResources);
    // Structure: uniquement les types de bâtiments construits
    const currentBuiltBuildingTypes = [...city.getBuildings()].sort();
    // Dynamique: niveaux des bâtiments construits (upgrade)
    const currentCityBuildingLevelsKey = currentBuiltBuildingTypes
      .map((bt) => `${bt}:${city.getBuildingLevel(bt) ?? city.getBuilding(bt)?.level ?? 0}`)
      .join(',');
    const currentCityLevel = city.level;

    // Découpage demandé:
    // - si la ville change OU si un bâtiment est construit (structure change) => on refait la section HTML
    // - sinon => mise à jour incrémentale (ne remplace pas les boutons, ne casse pas les hovers)
    const isFirstRender = this.lastSelectedVertexHash === null;
    const vertexChanged = this.lastSelectedVertexHash !== currentVertexHash;
    const builtTypesChanged = !this.arraysEqual(this.lastCityBuildings, currentBuiltBuildingTypes);
    const cityLevelChanged = this.lastCityLevel !== currentCityLevel;
    const structureChanged = isFirstRender || vertexChanged || builtTypesChanged || cityLevelChanged || this.lastNoSelectionRendered;

    const resourcesChanged = this.lastResourcesHash !== currentResourcesHash;
    const buildingLevelsChanged = this.lastCityBuildingLevelsKey !== currentCityBuildingLevelsKey;

    // Rien à faire si aucun changement pertinent
    if (!structureChanged && !resourcesChanged && !buildingLevelsChanged && !tradeChanged) {
      return;
    }

    // Mise à jour des caches
    this.lastSelectedVertexHash = currentVertexHash;
    this.lastResourcesHash = currentResourcesHash;
    this.lastCityBuildings = currentBuiltBuildingTypes;
    this.lastCityLevel = currentCityLevel;
    this.lastCityBuildingLevelsKey = currentCityBuildingLevelsKey;
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

    if (structureChanged) {
      // Recrée la structure HTML de la liste (li + spans + boutons)
      this.renderBuildingsListStructure(city, gameMap, selectedVertex, playerResources);
    }

    // Mise à jour incrémentale (ne remplace pas les boutons existants)
    this.updateBuildingsListDynamic(city, gameMap, selectedVertex, playerResources);
  }

  /**
   * Construit la structure HTML de la liste des bâtiments.
   * À appeler uniquement quand la ville change ou que la structure change (bâtiment construit, niveau de ville, etc.).
   */
  private renderBuildingsListStructure(city: City, gameMap: GameMap, vertex: Vertex, playerResources: PlayerResources): void {
    // Note: le titre/état dynamique est géré dans updateBuildingsListDynamic
    this.cityBuildingsList.innerHTML = '';

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
      item.dataset.buildingType = buildingType;
      item.dataset.buildingState = isBuilt ? 'built' : 'buildable';

      // Conteneur pour le nom et le coût
      const infoContainer = document.createElement('div');
      infoContainer.className = 'building-info';

      // Nom du bâtiment
      const nameSpan = document.createElement('span');
      nameSpan.className = 'building-name';
      nameSpan.dataset.role = 'name';
      // Le contenu exact est rempli dans updateBuildingsListDynamic
      nameSpan.textContent = getBuildingTypeName(buildingType);
      infoContainer.appendChild(nameSpan);

      // Si le bâtiment n'est pas construit et est constructible, afficher le coût
      if (!isBuilt && buildableStatus) {
        const costSpan = document.createElement('span');
        costSpan.className = 'building-cost';
        costSpan.dataset.role = 'cost-build';
        const costParts: string[] = [];
        for (const [resource, amount] of buildableStatus.cost.entries()) {
          costParts.push(`${amount} ${CityPanelView.RESOURCE_NAMES[resource]}`);
        }
        costSpan.textContent = costParts.join(', ');
        infoContainer.appendChild(costSpan);
      }

      item.appendChild(infoContainer);

      // Si le bâtiment est construit, afficher les boutons d'action
      if (isBuilt) {
        // Coût d'amélioration (placeholder, rempli/masqué dynamiquement)
        const upgradeCostSpan = document.createElement('span');
        upgradeCostSpan.className = 'building-cost';
        upgradeCostSpan.dataset.role = 'cost-upgrade';
        upgradeCostSpan.textContent = '';
        infoContainer.appendChild(upgradeCostSpan);

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

        // Bouton Spécialisation si Seaport niveau 2 sans spécialisation
        const building = city.getBuilding(buildingType);
        if (buildingType === BuildingType.Seaport && building && building.level === 2) {
          const specialization = building.getSpecialization();
          if (specialization === undefined) {
            const specializationBtn = document.createElement('button');
            specializationBtn.className = 'building-action-btn';
            specializationBtn.textContent = BUILDING_ACTION_NAMES[BuildingAction.Specialization];
            specializationBtn.disabled = false;
            specializationBtn.dataset.buildingAction = BuildingAction.Specialization;
            specializationBtn.dataset.buildingType = buildingType;
            item.appendChild(specializationBtn);
          }
        }

        // Bouton Améliorer (placeholder stable pour ne pas casser les hovers)
        const upgradeBtn = document.createElement('button');
        upgradeBtn.className = 'building-action-btn';
        upgradeBtn.textContent = BUILDING_ACTION_NAMES[BuildingAction.Upgrade];
        upgradeBtn.dataset.buildingAction = BuildingAction.Upgrade;
        upgradeBtn.dataset.buildingType = buildingType;
        item.appendChild(upgradeBtn);
      } else {
        // Si le bâtiment n'est pas construit, afficher le bouton de construction s'il est constructible
        if (buildableStatus) {
          const buildBtn = document.createElement('button');
          buildBtn.className = 'build-btn';
          buildBtn.textContent = 'Construire';
          // Stocker le buildingType dans le bouton pour le gestionnaire d'événement
          buildBtn.dataset.buildingType = buildingType;

          item.appendChild(buildBtn);
        }
      }

      this.cityBuildingsList.appendChild(item);
    }
  }

  /**
   * Met à jour uniquement les parties dynamiques du panneau (sans reconstruire le DOM).
   * Objectif: conserver les mêmes boutons/éléments pour éviter de casser les mouseover.
   */
  private updateBuildingsListDynamic(city: City, gameMap: GameMap, vertex: Vertex, playerResources: PlayerResources): void {
    // Titre avec le nombre de bâtiments construits / maximum
    const buildingCount = city.getBuildingCount();
    const maxBuildings = city.getMaxBuildings();
    this.cityBuildingsTitle.textContent = `Bâtiments ${buildingCount}/${maxBuildings}`;

    const builtBuildings = new Set(city.getBuildings());
    const buildableBuildings = BuildingController.getBuildableBuildingsWithStatus(city, gameMap, vertex, playerResources);
    const buildableBuildingsMap = new Map<BuildingType, { canBuild: boolean; blockedByBuildingLimit: boolean; cost: Map<ResourceType, number> }>();
    for (const status of buildableBuildings) {
      buildableBuildingsMap.set(status.buildingType, { canBuild: status.canBuild, blockedByBuildingLimit: status.blockedByBuildingLimit, cost: status.cost });
    }

    for (const li of Array.from(this.cityBuildingsList.querySelectorAll('li'))) {
      const buildingType = li.dataset.buildingType as BuildingType | undefined;
      const state = li.dataset.buildingState as 'built' | 'buildable' | undefined;
      if (!buildingType || !state) {
        continue;
      }

      const nameEl = li.querySelector('[data-role="name"]') as HTMLSpanElement | null;
      if (nameEl) {
        if (state === 'built') {
          const building = city.getBuilding(buildingType);
          const lvl = building?.level ?? 1;
          let name = `${getBuildingTypeName(buildingType)} (Niv. ${lvl})`;
          
          // Ajouter la spécialisation dans le nom si applicable
          if (buildingType === BuildingType.Seaport && building) {
            const specialization = building.getSpecialization();
            if (specialization !== undefined) {
              const resourceNames: Record<ResourceType, string> = {
                [ResourceType.Wood]: 'Bois',
                [ResourceType.Brick]: 'Brique',
                [ResourceType.Wheat]: 'Blé',
                [ResourceType.Sheep]: 'Mouton',
                [ResourceType.Ore]: 'Minerai',
              };
              name = `${getBuildingTypeName(buildingType)} (${resourceNames[specialization]})`;
            }
          }
          
          nameEl.textContent = name;
        } else {
          nameEl.textContent = getBuildingTypeName(buildingType);
        }
      }

      if (state === 'buildable') {
        const status = buildableBuildingsMap.get(buildingType);
        const buildBtn = li.querySelector('button.build-btn') as HTMLButtonElement | null;
        if (buildBtn) {
          // Désactiver uniquement si bloqué par la limite de bâtiments (pour garder un comportement stable)
          buildBtn.disabled = Boolean(status?.blockedByBuildingLimit);
        }
        continue;
      }

      // state === 'built'
      if (!builtBuildings.has(buildingType)) {
        // Si la structure a changé sans rebuild (théoriquement rare), ne rien faire ici.
        continue;
      }

      const building = city.getBuilding(buildingType);
      const canUpgrade = Boolean(building && building.canUpgrade());

      // Coût d'amélioration
      const upgradeCostEl = li.querySelector('[data-role="cost-upgrade"]') as HTMLSpanElement | null;
      if (upgradeCostEl) {
        if (building && canUpgrade) {
          const upgradeCost = building.getUpgradeCost();
          const costParts: string[] = [];
          for (const [resource, amount] of upgradeCost.entries()) {
            costParts.push(`${amount} ${CityPanelView.RESOURCE_NAMES[resource]}`);
          }
          upgradeCostEl.textContent = costParts.join(', ');
          upgradeCostEl.hidden = false;
        } else {
          upgradeCostEl.textContent = '';
          upgradeCostEl.hidden = true;
        }
      }

      // Bouton upgrade: rester stable, mais activer/désactiver selon possibilité/ressources
      const upgradeBtn = li.querySelector('button.building-action-btn[data-building-action="Upgrade"]') as HTMLButtonElement | null;
      if (upgradeBtn) {
        // Garder le bouton en place pour ne pas casser les hovers
        upgradeBtn.hidden = !canUpgrade;
        if (!canUpgrade) {
          upgradeBtn.disabled = true;
        } else {
          upgradeBtn.disabled = !BuildingController.canUpgrade(buildingType, city, playerResources);
        }
      }

      // Bouton Spécialisation: masquer si déjà spécialisé, afficher si Seaport niveau 2 sans spécialisation
      const specializationBtn = li.querySelector('button.building-action-btn[data-building-action="Specialization"]') as HTMLButtonElement | null;
      if (specializationBtn) {
        if (buildingType === BuildingType.Seaport && building) {
          const specialization = building.getSpecialization();
          specializationBtn.hidden = specialization !== undefined;
        }
      }
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
