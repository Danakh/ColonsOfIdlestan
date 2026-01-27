import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';
import { CityPanelView } from './view/CityPanelView';
import { TradePanelView } from './view/TradePanelView';
import { PortSpecializationPanelView } from './view/PortSpecializationPanelView';
import { AutomationPanelView, AutomationType } from './view/AutomationPanelView';
import { PrestigeConfirmationPanel } from './view/PrestigePanelView';
import { ResourceSprites } from './view/ResourceSprites';
import { InventoryView } from './view/InventoryView';
import { ResourceLoader } from './view/ResourceLoader';
import { initializeViews } from './view/ViewsInitializer';
import { GameCoordinator } from './controller/GameCoordinator';
import { ResourceHarvest } from './model/game/ResourceHarvest';
import { RoadConstruction } from './model/game/RoadConstruction';
import { RoadController } from './controller/RoadController';
import { OutpostController } from './controller/OutpostController';
import { ResourceHarvestController } from './controller/ResourceHarvestController';
import { BuildingController } from './controller/BuildingController';
import { TradeController } from './controller/TradeController';
import { BuildingProductionController } from './controller/BuildingProductionController';
import { AutomationController } from './controller/AutomationController';
import { PrestigeController } from './controller/PrestigeController';
import { ResourceType } from './model/map/ResourceType';
import { HexCoord } from './model/hex/HexCoord';
import { Edge } from './model/hex/Edge';
import { Vertex } from './model/hex/Vertex';
import { BuildingType, BuildingAction, getResourceProductionBuildings } from './model/city/BuildingType';
import { City } from './model/city/City';
import { IslandMap } from './model/map/IslandMap';
import { APP_VERSION, APP_NAME } from './config/version';
import { SaveManager } from './application/SaveManager';
import { GameLoop } from './application/GameLoop';
import { localize, setLocale, getAll } from './i18n';
import en from './i18n/en';
import fr from './i18n/fr';

/**
 * Point d'entrée principal de l'application web.
 */
function main(): void {
  // Mettre à jour le titre de la page avec la version
  document.title = `${APP_NAME} v${APP_VERSION}`;
  
  // Mettre à jour le titre dans le header
  const headerTitle = document.querySelector('.app-title');
  if (headerTitle) {
    headerTitle.textContent = `${APP_NAME} v${APP_VERSION}`;
  }

  // Variable pour stocker le gain de prestige en attente de confirmation
  let pendingPrestigeGain: number = 0;

  // Récupérer les éléments DOM
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  const settingsMenu = document.getElementById('settings-menu') as HTMLElement;
  const regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;
  const hardResetBtn = document.getElementById('hard-reset-btn') as HTMLButtonElement;
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
  const cheatBtn = document.getElementById('cheat-btn') as HTMLButtonElement;
  const showHexCoordsBtn = document.getElementById('show-hex-coords-btn') as HTMLButtonElement;
  const langFrBtn = document.getElementById('lang-fr-btn') as HTMLButtonElement | null;
  const langEnBtn = document.getElementById('lang-en-btn') as HTMLButtonElement | null;
  const gameTabs = document.getElementById('game-tabs') as HTMLElement | null;
  const classicTabBtn = document.getElementById('tab-classic') as HTMLButtonElement | null;
  const prestigeTabBtn = document.getElementById('tab-prestige') as HTMLButtonElement | null;
  // Les vues seront initialisées plus bas après création de `game`, `renderer` et `resourceLoader`.

  if (!canvas) {
    throw new Error(localize('error.canvasNotFound'));
  }

  if (!settingsBtn) {
    throw new Error(localize('error.elementNotFound', { id: 'settings-btn' }));
  }

  if (!settingsMenu) {
    throw new Error(localize('error.elementNotFound', { id: 'settings-menu' }));
  }

  if (!regenerateBtn) {
    throw new Error(localize('error.elementNotFound', { id: 'regenerate-btn' }));
  }

  if (!hardResetBtn) {
    throw new Error(localize('error.elementNotFound', { id: 'hard-reset-btn' }));
  }

  if (!exportBtn) {
    throw new Error(localize('error.elementNotFound', { id: 'export-btn' }));
  }

  if (!importBtn) {
    throw new Error(localize('error.elementNotFound', { id: 'import-btn' }));
  }

  if (!cheatBtn) {
    throw new Error(localize('error.elementNotFound', { id: 'cheat-btn' }));
  }

  if (!showHexCoordsBtn) {
    throw new Error(localize('error.elementNotFound', { id: 'show-hex-coords-btn' }));
  }

  // Langue: boutons optionnels (présents dans index.html)
  // Ils ne sont pas bloquants si absents (ex: tests sans DOM complet)

  if (!gameTabs || !classicTabBtn || !prestigeTabBtn) {
    throw new Error(localize('error.gameTabsNotFound'));
  }

  // Créer le jeu principal
  const game = new MainGame();
  // Créer le renderer
  const renderer = new HexMapRenderer(canvas);

  // Charger les sprites de ressources et créer la vue d'inventaire via ResourceLoader
  const resourceLoader = new ResourceLoader('resources-list');
  const resourceSprites = resourceLoader.getResourceSprites();

  resourceLoader.onAllLoaded(() => {
    // Mettre à jour l'affichage des ressources une fois les sprites chargés
    updateResourcesDisplay();
  });
  resourceLoader.load();

  // Maintenant que game, renderer et resourceLoader existent, initialiser les vues
  const views = initializeViews(game, renderer, resourceLoader);
  const cityPanelView = views.cityPanelView;
  const tradePanelView = views.tradePanelView;
  const portSpecializationPanelView = views.portSpecializationPanelView;
  const automationPanelView = views.automationPanelView;
  const prestigeConfirmationPanel = views.prestigeConfirmationPanel;
  // civilization upgrade panel removed; purchases handled elsewhere
  const inventoryView = views.inventoryView;

  // Donner la civilisation du joueur au panneau (bouton Commerce global)
  // Appliquer la locale initiale et définir l'attribut `lang` sur la racine
  localizePage();
  document.documentElement.lang = getAll() === en ? 'en' : 'fr';
  
  cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());
  
  // Redimensionner le canvas au chargement et au redimensionnement
  renderer.resize();
  window.addEventListener('resize', () => {
    renderer.resize();
    const islandMap = game.getIslandMap();
    if (islandMap) {
      const civId = game.getPlayerCivilizationId();
      safeRender(islandMap, civId);
    }
  });
  
  /**
   * Met à jour l'affichage des ressources du joueur.
   */
  function updateResourcesDisplay(): void {
    const playerResources = game.getPlayerResources();
    const islandMap = game.getIslandMap();
    const civId = game.getPlayerCivilizationId();
    inventoryView.updateDisplay(playerResources, islandMap, civId);
    // Mettre à jour les boutons du footer
    if (islandMap) {
      cityPanelView.updateFooter();
    }
  }

  // Appliquer les traductions sur les éléments marqués par `data-i18n`.
  function localizePage(): void {
    const nodes = document.querySelectorAll<HTMLElement>('[data-i18n]');
    nodes.forEach((n) => {
      const key = n.getAttribute('data-i18n');
      if (!key) return;
      const attr = n.getAttribute('data-i18n-attr');
      const text = localize(key);
      if (attr) {
        n.setAttribute(attr, text);
      } else {
        n.textContent = text;
      }
    });
    document.title = `${localize('app.title')} v${APP_VERSION}`;
  }

  // Save manager centralise autosave / export / import
  const saveManager = new SaveManager(game);

  // Game coordinator centralise les appels aux controllers
  const coordinator = new GameCoordinator(game, renderer, saveManager);

  // Boucle principale d'animation encapsulée
  const gameLoop = new GameLoop(game, renderer, cityPanelView, coordinator, updateResourcesDisplay);

  // Mode d'affichage courant (affecte le comportement du render callback)
  let currentViewMode: 'classic' | 'prestige' = 'classic';

  // Helper pour rendre en respectant le mode courant
  function safeRender(islandMap: IslandMap | null, civId?: any): void {
    if (!islandMap) return;
    if (currentViewMode === 'classic') {
            // Appel direct au renderer classique (éviter la récursion)
            renderer.render(islandMap, civId);
    } else {
      const civState = game.getController().getCivilizationState();
      const prestigeMap = civState.getPrestigeMap();
      if (prestigeMap) {
        // @ts-ignore
        (renderer as any).renderPrestige(prestigeMap);
      }
    }
  }

  function setActiveTab(mode: 'classic' | 'prestige'): void {
    console.log('[UI] setActiveTab()', mode);
    currentViewMode = mode;
    if (mode === 'classic') {
      console.log('[UI] switching to classic tab');
      // Update renderer flag
      (renderer as any).isPrestigeMode = false;
      classicTabBtn!.classList.add('active');
      classicTabBtn!.setAttribute('aria-pressed', 'true');
      prestigeTabBtn!.classList.remove('active');
      prestigeTabBtn!.setAttribute('aria-pressed', 'false');
      // Retirer la classe prestige sur le canvas et rendre la carte classique
      canvas.classList.remove('prestige');
      const islandMap = game.getIslandMap();
      if (islandMap) {
        const civId = game.getPlayerCivilizationId();
        console.log('[UI] rendering classic map for civ', civId);
        safeRender(islandMap, civId);
      }
    } else {
      console.log('[UI] switching to prestige tab');
      // Update renderer flag
      (renderer as any).isPrestigeMode = true;
      prestigeTabBtn!.classList.add('active');
      prestigeTabBtn!.setAttribute('aria-pressed', 'true');
      classicTabBtn!.classList.remove('active');
      classicTabBtn!.setAttribute('aria-pressed', 'false');
      // Ajouter la classe prestige pour changer le pourtour et afficher la mini-carte Prestige
      canvas.classList.add('prestige');
      const civState = game.getController().getCivilizationState();
      const prestigeMap = civState.getPrestigeMap();
      console.log('[UI] prestigeMap present?', !!prestigeMap);
      if (prestigeMap) {
        // Afficher la mini-carte Prestige (renderer dédié)
        // @ts-ignore - renderPrestige ajouté à HexMapRenderer
        console.log('[UI] calling renderer.renderPrestige()');
        (renderer as any).renderPrestige(prestigeMap);
      } else {
        // Si pas de PrestigeMap, vider le canvas
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  function updatePrestigeTabsVisibility(): void {
    const unlocked = game.getController().getCivilizationState().hasPrestige();
    console.log('[UI] updatePrestigeTabsVisibility() unlocked=', unlocked);
    gameTabs!.classList.toggle('hidden', !unlocked);
    prestigeTabBtn!.disabled = !unlocked;
  }

  function unlockPrestigeAccess(): void {
    updatePrestigeTabsVisibility();
  }

  // Civilization upgrade UI removed: upgrades are applied elsewhere on prestige activation.

  // Charger automatiquement la sauvegarde si elle existe, sinon créer une nouvelle partie
  const loaded = saveManager.loadFromLocal();
  if (!loaded) {
    game.newGame();
  } else {
    // Réappliquer les traductions et l'attribut lang après chargement
    localizePage();
    document.documentElement.lang = getAll() === en ? 'en' : 'fr';
    // Réinitialiser le temps de référence pour la boucle d'animation après le chargement
    // Cela permettra à la boucle de repartir correctement
    gameLoop.resetStartTime();
    // Sauvegarder immédiatement après le chargement pour s'assurer qu'on a une sauvegarde valide
    saveManager.saveToLocal();
    // Mettre à jour la civilisation du joueur dans le panneau de ville (peut avoir changé lors du chargement)
    cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());
  }
  
  const islandMap = game.getIslandMap();
      if (islandMap) {
        const civId = game.getPlayerCivilizationId();
        safeRender(islandMap, civId);
      }
  
  // Mettre à jour l'affichage après le chargement
  updateResourcesDisplay();
  cityPanelView.refreshNow();
  // Mettre à jour les boutons du footer
  cityPanelView.updateFooter();

  setActiveTab('classic');
  updatePrestigeTabsVisibility();

  classicTabBtn.addEventListener('click', () => {
    console.log('[UI] classicTab clicked');
    setActiveTab('classic');
  });

  prestigeTabBtn.addEventListener('click', () => {
    console.log('[UI] prestigeTab clicked disabled=', prestigeTabBtn.disabled);
    if (prestigeTabBtn.disabled) {
      console.log('[UI] prestigeTab click ignored because disabled');
      return;
    }
    setActiveTab('prestige');
  });

  // Configurer les callbacks du panneau de ville
  cityPanelView.setCallbacks({
    onPanelUpdated: (city: City | null) => {
      // Mettre à jour le bouton d'automatisation quand le panneau de ville est mis à jour
      automationPanelView.updateAutomationButton(city);
    },
    onBuildBuilding: (buildingType: BuildingType, city: City, islandMap: IslandMap, vertex: Vertex) => {
      try {
        const result = coordinator.buildBuilding(buildingType, city, vertex);
        if (result.success) {
          updateResourcesDisplay();
          cityPanelView.refreshNow();
          const civId = game.getPlayerCivilizationId();
            safeRender(islandMap, civId);
        }
      } catch (error) {
        console.error(localize('error.buildingConstructionFailed'), error);
      }
    },
    onBuildingAction: (action: BuildingAction, buildingType: BuildingType, city: City) => {
      try {
        if (action === BuildingAction.Upgrade) {
          const currentIslandMap = game.getIslandMap();
          if (!currentIslandMap) {
            console.error(localize('error.mapUnavailable'));
            return;
          }
          const result = coordinator.upgradeBuilding(buildingType, city);
          if (result.success) {
            updateResourcesDisplay();
            cityPanelView.refreshNow();
            const civId = game.getPlayerCivilizationId();
            safeRender(currentIslandMap, civId);
          }
        } else if (action === BuildingAction.Trade) {
          // Mettre à jour le contexte de jeu pour le panneau de commerce
          const currentIslandMap = game.getIslandMap();
          if (currentIslandMap) {
            const civId = game.getPlayerCivilizationId();
            tradePanelView.setGameContext(currentIslandMap, civId);
          }
          
          // Ouvrir le panneau de commerce
          const playerResources = game.getPlayerResources();
          tradePanelView.show(playerResources);
          return; // Ne pas mettre à jour le panneau de ville ni re-rendre
        } else if (action === BuildingAction.Specialization) {
          // Ouvrir le panneau de spécialisation avec les ressources déjà utilisées
          const selectedVertex = renderer.getSelectedVertex();
          const currentIslandMap = game.getIslandMap();
          if (selectedVertex && currentIslandMap && currentIslandMap.hasCity(selectedVertex)) {
            const city = currentIslandMap.getCity(selectedVertex);
            const civId = game.getPlayerCivilizationId();
            if (city && civId) {
              const blockedResources = TradeController.getUsedSpecializations(civId, currentIslandMap, city);
              portSpecializationPanelView.show(blockedResources);
            } else {
              portSpecializationPanelView.show();
            }
          } else {
            portSpecializationPanelView.show();
          }
          return; // Ne pas mettre à jour le panneau de ville ni re-rendre
        } else if (action === BuildingAction.Prestige) {
          // Activer l'action Prestige du port maritime niveau 4
          const currentIslandMap = game.getIslandMap();
          const civId = game.getPlayerCivilizationId();

          if (!currentIslandMap || !civId) {
            console.error(localize('error.mapOrCivUnavailable'));
            return;
          }

          // Vérifier si l'action peut être activée
          if (!PrestigeController.canActivatePrestige(civId, currentIslandMap)) {
            const reason = PrestigeController.getPrestigeRestrictionReason(civId, currentIslandMap);
            if (reason !== undefined) {
              alert(localize('prestige.unavailable', { reason }));
            }
            return;
          }

          // Activer l'action Prestige
          const civState = game.getController().getCivilizationState();
          const result = PrestigeController.calculatePrestigeGain(civState);
          
          if (result.success && result.civilizationPointsGained !== undefined) {
            // Stocker le gain en attente de confirmation
            pendingPrestigeGain = result.civilizationPointsGained;
            
            // Afficher le panneau de confirmation de prestige
            const currentPoints = civState.getPrestigePointsTotal();
            prestigeConfirmationPanel.show(currentPoints, result.civilizationPointsGained);
          } else {
            alert(result.message);
          }
          return;
        }
        cityPanelView.refreshNow();
        const currentIslandMap = game.getIslandMap();
        if (currentIslandMap) {
          const civId = game.getPlayerCivilizationId();
          safeRender(currentIslandMap, civId);
        }
      } catch (error) {
        console.error(localize('error.actionFailed', { action }), error);
      }
    },
  });

  // Configurer les callbacks du panneau de commerce
  tradePanelView.setCallbacks({
    onTrade: (offered: Map<ResourceType, number>, requested: Map<ResourceType, number>) => {
      const currentIslandMap = game.getIslandMap();
      if (!currentIslandMap) {
        return;
      }
      const result = coordinator.performBatchTrade(offered, requested);
      if (result.success) {
        updateResourcesDisplay();
        cityPanelView.scheduleRefresh();
        tradePanelView.hide();
      }
    },
    onCancel: () => {
      tradePanelView.hide();
    },
    onPortAutoTradeChange: (city: City, vertex: Vertex, enabled: boolean) => {
      try {
        const currentIslandMap = game.getIslandMap();
        if (!currentIslandMap) return;
        const civId = game.getPlayerCivilizationId();
        const seaport = city.getBuilding(BuildingType.Seaport);
        if (!seaport) return;

        seaport.setAutoTradeEnabled(enabled);

        // Mettre à jour l'affichage et sauvegarder
        updateResourcesDisplay();
        cityPanelView.refreshNow();
        safeRender(currentIslandMap, civId);
        saveManager.saveToLocal();
      } catch (error) {
        console.error(localize('error.actionFailed', { action: 'autoTrade' }), error);
      }
    },
  });

  // Configurer les callbacks du panneau de spécialisation
  portSpecializationPanelView.setCallbacks({
    onSelectResource: (resource: ResourceType) => {
      const selectedVertex = renderer.getSelectedVertex();
      const currentIslandMap = game.getIslandMap();
      if (!selectedVertex || !currentIslandMap || !currentIslandMap.hasCity(selectedVertex)) {
        return;
      }
      const city = currentIslandMap.getCity(selectedVertex);
      if (!city) {
        return;
      }

      // Vérifier que la ressource n'est pas déjà utilisée par un autre port
      const civId = game.getPlayerCivilizationId();
      if (civId) {
        const blockedResources = TradeController.getUsedSpecializations(civId, currentIslandMap, city);
        if (blockedResources.has(resource)) {
          alert(localize('port.specialization.blocked'));
          return;
        }
      }

      try {
        const seaport = city.getBuilding(BuildingType.Seaport);
        if (seaport) {
          seaport.setSpecialization(resource);

          // Mettre à jour l'affichage
          updateResourcesDisplay();
            cityPanelView.refreshNow();

            // Re-rendre la carte
            const civId = game.getPlayerCivilizationId();
            safeRender(currentIslandMap, civId);

          // Sauvegarder le jeu via SaveManager
          saveManager.saveToLocal();

          // Fermer le panneau de spécialisation
          portSpecializationPanelView.hide();
        }
      } catch (error) {
        console.error(localize('error.specializationFailed'), error);
        alert(localize('error.specializationFailedDetail', { detail: error instanceof Error ? error.message : String(error) }));
      }
    },
    onCancel: () => {
      portSpecializationPanelView.hide();
    },
  });

  // Configurer les callbacks du panneau d'automatisation
  automationPanelView.configureCallbacks({
    getSelectedVertex: () => renderer.getSelectedVertex(),
    getIslandMap: () => game.getIslandMap(),
    getPlayerCivilizationId: () => game.getPlayerCivilizationId(),
    getCivilization: (civId) => game.getIslandState().getCivilization(civId),
    updateResourcesDisplay: () => updateResourcesDisplay(),
    refreshCityPanel: () => cityPanelView.refreshNow(),
    getCurrentCity: () => cityPanelView.getCurrentCity(),
    renderMap: (islandMap, civId) => safeRender(islandMap, civId),
    autoSave: () => saveManager.saveToLocal(),
  });

  // Configurer les callbacks du panneau de confirmation de prestige
  prestigeConfirmationPanel.setCallbacks({
    onConfirm: () => {
      if (pendingPrestigeGain > 0) {
        const civState = game.getController().getCivilizationState();
        // Activer réellement le prestige (ajoute les points et détruit l'IslandState)
        const result = PrestigeController.activatePrestige(civState);

        if (result.success) {
          updatePrestigeTabsVisibility();

          // Démarrer directement une nouvelle partie après activation du prestige
          game.newGame();
          gameLoop.resetStartTime();
          saveManager.saveToLocal();

          cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());

          const newIslandMap = game.getIslandMap();
          if (newIslandMap) {
            const civId = game.getPlayerCivilizationId();
            safeRender(newIslandMap, civId);
            updateResourcesDisplay();
            cityPanelView.refreshNow();
            cityPanelView.updateFooter();
          }

          pendingPrestigeGain = 0;
          setActiveTab('classic');
        } else {
          // En cas d'erreur, annuler
          alert(result.message);
          pendingPrestigeGain = 0;
        }
      }
    },
    onCancel: () => {
      pendingPrestigeGain = 0;
      const currentIslandMap = game.getIslandMap();
      const civId = game.getPlayerCivilizationId();
      if (currentIslandMap && civId) {
        safeRender(currentIslandMap, civId);
      }
      setActiveTab('classic');
    },
  });


  // Gérer les événements personnalisés du panneau de ville
  const panelElement = cityPanelView.getPanelElement();
  
  panelElement.addEventListener('buildBuilding', ((e: CustomEvent) => {
    const selectedVertex = renderer.getSelectedVertex();
    const currentIslandMap = game.getIslandMap();
    if (!selectedVertex || !currentIslandMap || !currentIslandMap.hasCity(selectedVertex)) {
      return;
    }
    const city = currentIslandMap.getCity(selectedVertex);
    if (!city) {
      return;
    }
    cityPanelView.handleBuildBuilding(e.detail.buildingType, city, currentIslandMap, selectedVertex);
  }) as EventListener);

  // Bouton Commerce global (footer du panneau de ville)
  panelElement.addEventListener('openTrade', (() => {
    const currentIslandMap = game.getIslandMap();
    if (!currentIslandMap) {
      return;
    }
    const civId = game.getPlayerCivilizationId();
    tradePanelView.setGameContext(currentIslandMap, civId);
    tradePanelView.show(game.getPlayerResources());
  }) as EventListener);


  panelElement.addEventListener('buildingAction', ((e: CustomEvent) => {
    const selectedVertex = renderer.getSelectedVertex();
    const currentIslandMap = game.getIslandMap();
    if (!selectedVertex || !currentIslandMap || !currentIslandMap.hasCity(selectedVertex)) {
      return;
    }
    const city = currentIslandMap.getCity(selectedVertex);
    if (!city) {
      return;
    }
    const action = e.detail.buildingAction as BuildingAction;
    const buildingType = e.detail.buildingType as BuildingType;
    const checked = e.detail.checked as boolean | undefined;
    // Si l'action est l'activation/désactivation de l'auto-trade, l'état "checked" est fourni
    if (action === BuildingAction.Auto && checked !== undefined) {
      try {
        const seaport = city.getBuilding(buildingType);
        if (seaport) {
          seaport.setAutoTradeEnabled(checked);

          // Mettre à jour l'affichage et sauvegarder
          const civId = game.getPlayerCivilizationId();
          updateResourcesDisplay();
          cityPanelView.refreshNow();
          safeRender(currentIslandMap, civId);
          saveManager.saveToLocal();
        }
      } catch (error) {
        console.error(localize('error.actionFailed', { action }), error);
      }
      return;
    }

    cityPanelView.handleBuildingAction(action, buildingType, city);
  }) as EventListener);

  // Configurer le callback de rendu pour la surbrillance au survol et la mise à jour du panneau
  renderer.setRenderCallback(() => {
    // Respecter le mode d'affichage courant pour éviter d'écraser la vue Prestige
    if (currentViewMode === 'classic') {
      const currentIslandMap = game.getIslandMap();
      if (currentIslandMap) {
            const civId = game.getPlayerCivilizationId();
            safeRender(currentIslandMap, civId);
      }
    } else {
      const civState = game.getController().getCivilizationState();
      const prestigeMap = civState.getPrestigeMap();
      if (prestigeMap) {
        // @ts-ignore - renderPrestige exists on renderer
        (renderer as any).renderPrestige(prestigeMap);
      }
    }
  });

  // Mettre à jour l'affichage des ressources
  updateResourcesDisplay();

  // Gérer le clic sur les vertices constructibles pour construire des avant-postes
  renderer.setOnOutpostVertexClick((vertex: Vertex) => {
    const currentIslandMap = game.getIslandMap();
    if (!currentIslandMap) {
      return;
    }
    const result = coordinator.buildOutpost(vertex);
    if (result.success) {
      updateResourcesDisplay();
      cityPanelView.scheduleRefresh();
      const civId = game.getPlayerCivilizationId();
      safeRender(currentIslandMap, civId);
      cityPanelView.refreshNow();
    }
  });

  // Gérer le clic sur les routes (edges) pour les construire
  renderer.setOnEdgeClick((edge: Edge) => {
    const currentIslandMap = game.getIslandMap();
    if (!currentIslandMap) {
      return;
    }
    const result = coordinator.buildRoad(edge);
    if (result.success) {
      updateResourcesDisplay();
      cityPanelView.scheduleRefresh();
      const civId = game.getPlayerCivilizationId();
      safeRender(currentIslandMap, civId);
    }
  });

  // Gérer le clic sur les hexagones pour récolter les ressources
  renderer.setOnHexClick((hexCoord: HexCoord) => {
    const currentIslandMap = game.getIslandMap();
    if (!currentIslandMap) {
      return;
    }
    const result = coordinator.harvestHex(hexCoord);
    if (result.success && result.cityVertex) {
      // Déclencher l'effet visuel de récolte (manuel, donc avec effet de réduction)
      renderer.triggerHarvestEffect(hexCoord, false);
      
      // Obtenir le type de ressource récoltée pour l'animation
      const hexType = currentIslandMap.getHexType(hexCoord);
      if (hexType) {
        const resourceType = ResourceHarvest.hexTypeToResourceType(hexType);
        if (resourceType) {
          // Déclencher l'animation de la particule de ressource vers la ville
          renderer.triggerResourceHarvestAnimation(hexCoord, resourceType, result.cityVertex);
        }
      }
      
      // Mettre à jour l'affichage des ressources
      updateResourcesDisplay();
      cityPanelView.scheduleRefresh();
    }
    // Si result.success est false, la récolte a échoué (limitation de taux ou autre raison)
    // On pourrait afficher un message à l'utilisateur avec result.remainingTimeMs si nécessaire
  });

  // Gérer le bouton d'engrenage pour ouvrir/fermer le menu
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Empêcher la fermeture immédiate
    settingsMenu.classList.toggle('hidden');
  });

  // Fermer le menu si on clique ailleurs
  document.addEventListener('click', (e) => {
    if (!settingsMenu.contains(e.target as Node) && !settingsBtn.contains(e.target as Node)) {
      settingsMenu.classList.add('hidden');
    }
  });

  // Gérer le bouton de régénération dans le menu
  regenerateBtn.addEventListener('click', () => {
    game.newGame();
    // Réinitialiser le temps de référence pour la boucle d'animation
    gameLoop.resetStartTime();
    
    // Sauvegarder immédiatement après la régénération
    saveManager.saveToLocal();
    
    const newIslandMap = game.getIslandMap();
    if (newIslandMap) {
      const civId = game.getPlayerCivilizationId();
      safeRender(newIslandMap, civId);
      updateResourcesDisplay(); // Réinitialiser l'affichage des ressources
      cityPanelView.refreshNow(); // Mettre à jour le panneau de la ville
    }
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });

  // Gérer le bouton de hard reset dans le menu
  hardResetBtn.addEventListener('click', () => {
    const ok = confirm(localize('confirm.hardReset'));
    if (!ok) return;

    // Effacer complètement la sauvegarde (réinitialise GodState)
    game.clearSave();
    // Sauvegarder l'état vidé
    saveManager.saveToLocal();

    // Démarrer une nouvelle partie comme 'Nouvelle Carte'
    game.newGame();
    gameLoop.resetStartTime();

    // Réinitialiser les variables UI liées au prestige / panneaux
    pendingPrestigeGain = 0;
    prestigeConfirmationPanel.hide();
    setActiveTab('classic');
    updatePrestigeTabsVisibility();

    // Mettre à jour l'UI générale
    cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());
    const newIslandMap2 = game.getIslandMap();
      if (newIslandMap2) {
      const civId = game.getPlayerCivilizationId();
      safeRender(newIslandMap2, civId);
      updateResourcesDisplay();
      cityPanelView.refreshNow();
      cityPanelView.updateFooter();
    }

    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });

  // Gérer le bouton d'export dans le menu
  exportBtn.addEventListener('click', () => {
    saveManager.exportSave();
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });

  // Gérer le bouton d'import dans le menu
  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    
    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      const result = await saveManager.importFromFile(file);
      if (!result.success) {
        alert(localize('alert.importError'));
        return;
      }

      // Mettre à jour la civilisation du joueur dans le panneau de ville (peut avoir changé lors du chargement)
      cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());

      // Mettre à jour l'affichage
      const newIslandMap = game.getIslandMap();
      if (newIslandMap) {
        const civId = game.getPlayerCivilizationId();
        safeRender(newIslandMap, civId);
        updateResourcesDisplay();
        cityPanelView.refreshNow();
        // Mettre à jour les boutons du footer avec la civilisation chargée
        cityPanelView.updateFooter();
      }
      // Retirer l'input du DOM
      document.body.removeChild(input);
    });
    
    document.body.appendChild(input);
    input.click();
    
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });

  // Gérer le bouton cheat dans le menu
  cheatBtn.addEventListener('click', () => {
    const playerResources = game.getPlayerResources();
    
    // Ajouter 100 ressources de chaque type
    playerResources.addResource(ResourceType.Wood, 100);
    playerResources.addResource(ResourceType.Brick, 100);
    playerResources.addResource(ResourceType.Wheat, 100);
    playerResources.addResource(ResourceType.Sheep, 100);
    playerResources.addResource(ResourceType.Ore, 100);
    
    // Mettre à jour l'affichage des ressources
    updateResourcesDisplay();
    cityPanelView.scheduleRefresh();
    
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });

  // Gérer le bouton d'affichage des coordonnées des hexs
  let showHexCoords = false;
  showHexCoordsBtn.addEventListener('click', () => {
    showHexCoords = !showHexCoords;
    renderer.setShowCoordinates(showHexCoords);
    
    // Re-rendre la carte pour afficher/masquer les coordonnées
    const islandMap = game.getIslandMap();
    if (islandMap) {
      const civId = game.getPlayerCivilizationId();
      safeRender(islandMap, civId);
    }
    
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });

  // Gérer le changement de langue (si les boutons existent)
  const applyLocaleChange = (localeRecord: Record<string, string>, langCode: string) => {
    setLocale(localeRecord);
    document.documentElement.lang = langCode;

    // Appliquer la traduction sur la page
    localizePage();

    // Rafraîchir les vues dépendantes de la locale
    updateResourcesDisplay();
    cityPanelView.refreshNow();
    const currentIslandMap = game.getIslandMap();
    if (currentIslandMap) {
      const civId = game.getPlayerCivilizationId();
      safeRender(currentIslandMap, civId);
    }

    // Persister la préférence de langue dans la sauvegarde et forcer un autosave immédiat
    try {
      game.setLanguage(langCode);
      saveManager.saveToLocal();
    } catch (e) {
      console.error('Failed to persist language preference', e);
    }

    // Fermer le menu
    settingsMenu.classList.add('hidden');
  };

  if (langFrBtn) {
    langFrBtn.addEventListener('click', () => applyLocaleChange(fr, 'fr'));
  }

  if (langEnBtn) {
    langEnBtn.addEventListener('click', () => applyLocaleChange(en, 'en'));
  }


  // Initialiser le panneau (sidebar fixe)
  cityPanelView.refreshNow();


  // Démarrer la boucle d'animation
  gameLoop.start();

  // Sauvegarder automatiquement toutes les secondes via SaveManager
  saveManager.startAutosave(1000);
}

// Lancer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
