import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';
import { CityPanelView } from './view/CityPanelView';
import { TradePanelView } from './view/TradePanelView';
import { PortSpecializationPanelView } from './view/PortSpecializationPanelView';
import { AutomationPanelView, AutomationType } from './view/AutomationPanelView';
import { PrestigeConfirmationPanel } from './view/PrestigePanelView';
import { CivilizationUpgradePanelView, CivilizationUpgrade } from './view/CivilizationUpgradePanelView';
import { ResourceSprites } from './view/ResourceSprites';
import { InventoryView } from './view/InventoryView';
import { ResourceLoader } from './view/ResourceLoader';
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
  let currentUpgradePanelMode: 'prestige' | 'consultation' | null = null;

  // Récupérer les éléments DOM
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  const settingsMenu = document.getElementById('settings-menu') as HTMLElement;
  const regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
  const cheatBtn = document.getElementById('cheat-btn') as HTMLButtonElement;
  const showHexCoordsBtn = document.getElementById('show-hex-coords-btn') as HTMLButtonElement;
  const gameTabs = document.getElementById('game-tabs') as HTMLElement | null;
  const classicTabBtn = document.getElementById('tab-classic') as HTMLButtonElement | null;
  const prestigeTabBtn = document.getElementById('tab-prestige') as HTMLButtonElement | null;
  // Créer la vue du panneau de ville
  const cityPanelView = new CityPanelView('city-panel');

  // Créer la vue du panneau de commerce
  const tradePanelView = new TradePanelView('trade-panel');

  // Créer la vue du panneau de spécialisation du port
  const portSpecializationPanelView = new PortSpecializationPanelView('port-specialization-panel');

  // Créer la vue du panneau d'automatisation
  const automationPanelView = new AutomationPanelView('automation-panel');

  // Créer la vue du panneau de confirmation de prestige
  const prestigeConfirmationPanel = new PrestigeConfirmationPanel('prestige-panel');

  // Créer la vue du panneau d'amélioration de civilisation
  const civilizationUpgradePanel = new CivilizationUpgradePanelView('civilization-upgrade-panel');

  if (!canvas) {
    throw new Error('Canvas introuvable');
  }

  if (!settingsBtn) {
    throw new Error('Bouton de paramètres introuvable');
  }

  if (!settingsMenu) {
    throw new Error('Menu de paramètres introuvable');
  }

  if (!regenerateBtn) {
    throw new Error('Bouton de régénération introuvable');
  }

  if (!exportBtn) {
    throw new Error('Bouton d\'export introuvable');
  }

  if (!importBtn) {
    throw new Error('Bouton d\'import introuvable');
  }

  if (!cheatBtn) {
    throw new Error('Bouton cheat introuvable');
  }

  if (!showHexCoordsBtn) {
    throw new Error('Bouton afficher coordonnées hexs introuvable');
  }

  if (!gameTabs || !classicTabBtn || !prestigeTabBtn) {
    throw new Error('Onglets de navigation du jeu introuvables');
  }

  // Créer le jeu principal
  const game = new MainGame();
  // Donner la civilisation du joueur au panneau (bouton Commerce global)
  cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());

  // Créer le renderer
  const renderer = new HexMapRenderer(canvas);
  
  // Configurer le renderer pour le panneau de ville
  cityPanelView.setRenderer(renderer);
  cityPanelView.bind(renderer, {
    getIslandMap: () => game.getIslandMap(),
    getPlayerResources: () => game.getPlayerResources(),
  });
  
  // Charger les sprites de ressources et créer la vue d'inventaire via ResourceLoader
  const resourceLoader = new ResourceLoader('resources-list');
  const resourceSprites = resourceLoader.getResourceSprites();
  const inventoryView = resourceLoader.getInventoryView();

  resourceLoader.onAllLoaded(() => {
    // Mettre à jour l'affichage des ressources une fois les sprites chargés
    updateResourcesDisplay();
  });
  resourceLoader.load();

  // Configurer les sprites de ressources pour les panneaux
  tradePanelView.setResourceSprites(resourceSprites);
  portSpecializationPanelView.setResourceSprites(resourceSprites);
  
  // Redimensionner le canvas au chargement et au redimensionnement
  renderer.resize();
  window.addEventListener('resize', () => {
    renderer.resize();
    const islandMap = game.getIslandMap();
    if (islandMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(islandMap, civId);
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

  // Save manager centralise autosave / export / import
  const saveManager = new SaveManager(game);

  // Game coordinator centralise les appels aux controllers
  const coordinator = new GameCoordinator(game, renderer, saveManager);

  // Boucle principale d'animation pour gérer le temps et la production automatique
  let lastAnimationFrame: number | null = null;
  let gameStartTime: number | null = null;

  function setActiveTab(mode: 'classic' | 'prestige'): void {
    if (mode === 'classic') {
      classicTabBtn.classList.add('active');
      classicTabBtn.setAttribute('aria-pressed', 'true');
      prestigeTabBtn.classList.remove('active');
      prestigeTabBtn.setAttribute('aria-pressed', 'false');
    } else {
      prestigeTabBtn.classList.add('active');
      prestigeTabBtn.setAttribute('aria-pressed', 'true');
      classicTabBtn.classList.remove('active');
      classicTabBtn.setAttribute('aria-pressed', 'false');
    }
  }

  function updatePrestigeTabsVisibility(): void {
    const unlocked = game.getController().getCivilizationState().hasPrestige();
    gameTabs.classList.toggle('hidden', !unlocked);
    prestigeTabBtn.disabled = !unlocked;
  }

  function unlockPrestigeAccess(): void {
    if (!prestigeUnlocked) {
      prestigeUnlocked = true;
      localStorage.setItem(PRESTIGE_UNLOCK_KEY, 'true');
    }
    updatePrestigeTabsVisibility();
  }

  function buildPrestigeUpgrades(): CivilizationUpgrade[] {
    const civId = game.getPlayerCivilizationId();
    const civ = game.getIslandState().getCivilization(civId);
    return [
      {
        id: 'resource-harvest-x1.5',
        label: 'Récolte +50%',
        description: 'Augmente le gain de ressources de 50% pour la prochaine partie.',
        cost: 5,
        onPurchase: () => {
          const current = civ.getResourceGainLevel();
          civ.setResourceGainLevel(current + 5);
        },
      },
      {
        id: 'civilization-points-x1.25',
        label: 'Points de civilisation +25%',
        description: 'Augmente les points de civilisation gagnés de 25% pour la prochaine partie.',
        cost: 7,
        onPurchase: () => {
          const current = civ.getCivPointGainLevel();
          civ.setCivPointGainLevel(current + 3);
        },
      },
      {
        id: 'builders-guild-unlock',
        label: 'Débloquer Guilde des batisseurs',
        description: 'Rend disponible la Guilde des batisseurs dès le départ de la partie suivante.',
        cost: 10,
        onPurchase: () => {
          console.log('Déblocage Guilde des batisseurs pour la prochaine partie');
        },
      },
    ];
  }

  const handleUpgradePurchased = (upgradeId: string, remainingPoints: number): void => {
    console.log(`Amélioration achetée: ${upgradeId}, Points restants: ${remainingPoints}`);
  };

  const closePrestigeUpgradePanel = (): void => {
    civilizationUpgradePanel.hide();
    currentUpgradePanelMode = null;
    setActiveTab('classic');

    game.newGame();
    gameStartTime = null;

    saveManager.saveToLocal();

    cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());

    const newIslandMap = game.getIslandMap();
    if (newIslandMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(newIslandMap, civId);
      updateResourcesDisplay();
      cityPanelView.refreshNow();
      cityPanelView.updateFooter();
    }

    updatePrestigeTabsVisibility();
  };

  const closeConsultationPanel = (): void => {
    civilizationUpgradePanel.hide();
    currentUpgradePanelMode = null;
    setActiveTab('classic');
  };

  const showPrestigeUpgradePanel = (
    mode: 'prestige' | 'consultation',
    availablePoints: number,
    subtitle?: string,
  ): void => {
    currentUpgradePanelMode = mode;
    civilizationUpgradePanel.setUpgrades(buildPrestigeUpgrades());
    const civState = game.getController().getCivilizationState();
    civilizationUpgradePanel.setCallbacks({
      onClose: mode === 'prestige' ? closePrestigeUpgradePanel : closeConsultationPanel,
      onUpgradePurchased: handleUpgradePurchased,
    });
    civilizationUpgradePanel.show(availablePoints, {
      totalPrestigePoints: civState.getPrestigePointsTotal(),
      readOnly: mode === 'consultation',
      closeLabel: mode === 'prestige' ? 'Fermer et Relancer la Partie' : 'Fermer',
      subtitle,
    });
    setActiveTab('prestige');
  };

  const openPrestigeConsultationPanel = (): void => {
    const subtitle = 'Aucun point en attente. Gagnez un nouveau Prestige pour débloquer des points.';
    showPrestigeUpgradePanel('consultation', 0, subtitle);
  };

  // Charger automatiquement la sauvegarde si elle existe, sinon créer une nouvelle partie
  const loaded = saveManager.loadFromLocal();
  if (!loaded) {
    game.newGame();
  } else {
    // Réinitialiser le temps de référence pour la boucle d'animation après le chargement
    // Cela permettra à la boucle de repartir correctement
    gameStartTime = null;
    // Sauvegarder immédiatement après le chargement pour s'assurer qu'on a une sauvegarde valide
    saveManager.saveToLocal();
    // Mettre à jour la civilisation du joueur dans le panneau de ville (peut avoir changé lors du chargement)
    cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());
  }
  
  const islandMap = game.getIslandMap();
  if (islandMap) {
    const civId = game.getPlayerCivilizationId();
    renderer.render(islandMap, civId);
  }
  
  // Mettre à jour l'affichage après le chargement
  updateResourcesDisplay();
  cityPanelView.refreshNow();
  // Mettre à jour les boutons du footer
  cityPanelView.updateFooter();

  setActiveTab('classic');
  updatePrestigeTabsVisibility();

  classicTabBtn.addEventListener('click', () => {
    if (currentUpgradePanelMode === 'prestige') {
      closePrestigeUpgradePanel();
      return;
    }
    if (currentUpgradePanelMode === 'consultation') {
      closeConsultationPanel();
    } else {
      setActiveTab('classic');
    }
  });

  prestigeTabBtn.addEventListener('click', () => {
    if (prestigeTabBtn.disabled) {
      return;
    }
    openPrestigeConsultationPanel();
  });

  // Configurer les callbacks du panneau de ville
  cityPanelView.setCallbacks({
    onPanelUpdated: (city: City | null) => {
      // Mettre à jour le bouton d'automatisation quand le panneau de ville est mis à jour
      automationPanelView.updateAutomationButton(city);
    },
    onBuildBuilding: (buildingType: BuildingType, city: City, islandMap: IslandMap, vertex: Vertex) => {
      const playerResources = game.getPlayerResources();
      const gameClock = game.getGameClock();
      try {
        BuildingController.buildBuilding(buildingType, city, islandMap, vertex, playerResources);
        
        // Si c'est un bâtiment de ressource, initialiser son temps de production
        const resourceBuildings = getResourceProductionBuildings();
        if (resourceBuildings.includes(buildingType)) {
          const currentTime = gameClock.getCurrentTime();
          city.getBuilding(buildingType)?.setProductionTimeSeconds(currentTime);
        }
        
        updateResourcesDisplay();
        cityPanelView.refreshNow();
        const civId = game.getPlayerCivilizationId();
        renderer.render(islandMap, civId);
      } catch (error) {
        console.error('Erreur lors de la construction du bâtiment:', error);
      }
    },
    onBuildingAction: (action: BuildingAction, buildingType: BuildingType, city: City) => {
      try {
        if (action === BuildingAction.Upgrade) {
          const playerResources = game.getPlayerResources();
          const currentIslandMap = game.getIslandMap();
          if (!currentIslandMap) {
            console.error('Carte de jeu non disponible');
            return;
          }
          BuildingController.upgradeBuilding(buildingType, city, currentIslandMap, playerResources);
          updateResourcesDisplay();
          cityPanelView.refreshNow();
          const civId = game.getPlayerCivilizationId();
          renderer.render(currentIslandMap, civId);
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
            console.error('Carte de jeu ou civilisation non disponible');
            return;
          }

          // Vérifier si l'action peut être activée
          if (!PrestigeController.canActivatePrestige(civId, currentIslandMap)) {
            const reason = PrestigeController.getPrestigeRestrictionReason(civId, currentIslandMap);
            alert(`Prestige non disponible: ${reason}`);
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
          renderer.render(currentIslandMap, civId);
        }
      } catch (error) {
        console.error(`Erreur lors de l'action ${action}:`, error);
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
          alert(`Cette ressource est déjà spécialisée par un autre port de votre civilisation.`);
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
          renderer.render(currentIslandMap, civId);

          // Sauvegarder le jeu via SaveManager
          saveManager.saveToLocal();

          // Fermer le panneau de spécialisation
          portSpecializationPanelView.hide();
        }
      } catch (error) {
        console.error('Erreur lors de la spécialisation:', error);
        alert(`Erreur lors de la spécialisation: ${error instanceof Error ? error.message : String(error)}`);
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
    renderMap: (islandMap, civId) => renderer.render(islandMap, civId),
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
          showPrestigeUpgradePanel('prestige', pendingPrestigeGain);
          pendingPrestigeGain = 0;
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
        renderer.render(currentIslandMap, civId);
      }
      setActiveTab('classic');
    },
  });

  // Configurer les callbacks du panneau d'amélioration de civilisation (par défaut)
  civilizationUpgradePanel.setCallbacks({
    onClose: closePrestigeUpgradePanel,
    onUpgradePurchased: handleUpgradePurchased,
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
    
    cityPanelView.handleBuildingAction(action, buildingType, city);
  }) as EventListener);

  // Configurer le callback de rendu pour la surbrillance au survol et la mise à jour du panneau
  renderer.setRenderCallback(() => {
    const currentIslandMap = game.getIslandMap();
    if (currentIslandMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(currentIslandMap, civId);
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
      renderer.render(currentIslandMap, civId);
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
      renderer.render(currentIslandMap, civId);
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
    gameStartTime = null;
    
    // Sauvegarder immédiatement après la régénération
    saveManager.saveToLocal();
    
    const newIslandMap = game.getIslandMap();
    if (newIslandMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(newIslandMap, civId);
      updateResourcesDisplay(); // Réinitialiser l'affichage des ressources
      cityPanelView.refreshNow(); // Mettre à jour le panneau de la ville
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
        alert('Erreur lors de l\'import de la partie. Le fichier est peut-être invalide.');
        return;
      }

      // Réinitialiser le temps de référence pour la boucle d'animation
      gameStartTime = null;

      // Mettre à jour la civilisation du joueur dans le panneau de ville (peut avoir changé lors du chargement)
      cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());

      // Mettre à jour l'affichage
      const newIslandMap = game.getIslandMap();
      if (newIslandMap) {
        const civId = game.getPlayerCivilizationId();
        renderer.render(newIslandMap, civId);
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
      renderer.render(islandMap, civId);
    }
    
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });


  // Initialiser le panneau (sidebar fixe)
  cityPanelView.refreshNow();

  /**
   * Traite la production automatique des bâtiments et déclenche les animations.
   */
  function processAutomaticBuildingProduction(): void {
    const currentIslandMap = game.getIslandMap();
    if (!currentIslandMap) {
      return;
    }

    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();
    const gameClock = game.getGameClock();

    // Traiter la production automatique via le contrôleur
    const productionResults = BuildingProductionController.processAutomaticProduction(
      civId,
      currentIslandMap,
      playerResources,
      gameClock
    );

    // Si des productions ont eu lieu, déclencher les animations et mettre à jour l'affichage
    if (productionResults.length > 0) {
      // Déclencher les animations pour chaque production
      for (const result of productionResults) {
        // Vérifier si c'est un marché niveau 2 (production spéciale)
        if (result.buildingType === BuildingType.Market) {
          // Pour le marché niveau 2, animation spéciale : particule qui monte depuis la ville
          renderer.triggerMarketProductionAnimation(
            result.cityVertex,
            result.resourceType
          );
        } else {
          // Pour les autres bâtiments, animation normale : hex vers ville
          // Effet visuel sur l'hex récolté (automatique, donc sans effet de réduction)
          renderer.triggerHarvestEffect(result.hexCoord, true);
          
          // Animation de la particule de ressource vers la ville ayant déclenché le harvest
          renderer.triggerResourceHarvestAnimation(
            result.hexCoord,
            result.resourceType,
            result.cityVertex
          );
        }
      }

      // Mettre à jour l'affichage des ressources
      updateResourcesDisplay();
      cityPanelView.scheduleRefresh();
    }
  }

  /**
   * Boucle d'animation principale qui gère le temps et la production automatique.
   */
  function gameLoop(timestamp: number): void {
    // Initialiser le temps de référence au premier appel
    if (gameStartTime === null) {
      gameStartTime = timestamp;
      // Si on a chargé une partie, on doit ajuster gameStartTime pour tenir compte
      // du temps déjà écoulé dans le GameClock
      const savedTime = game.getGameClock().getCurrentTime();
      if (savedTime > 0) {
        // Ajuster gameStartTime pour que le temps continue depuis où il était
        gameStartTime = timestamp - savedTime * 1000;
      }
    }

    // Calculer le temps écoulé depuis le début en secondes
    const timeSeconds = (timestamp - gameStartTime) / 1000;

    // Mettre à jour l'horloge de jeu
    game.updateGameTime(timeSeconds);

    // Traiter la production automatique
    processAutomaticBuildingProduction();

    // Traiter les automatisations
    const currentIslandMap = game.getIslandMap();
    if (currentIslandMap) {
      const civId = game.getPlayerCivilizationId();
      const playerResources = game.getPlayerResources();
      const civilization = game.getIslandState().getCivilization(civId);
      AutomationController.processAllAutomations(civId, civilization, currentIslandMap, playerResources);
      
      // Mettre à jour l'affichage si des automatisations ont été exécutées
      updateResourcesDisplay();
      cityPanelView.scheduleRefresh();
      
      // Re-rendre la carte si nécessaire
      renderer.render(currentIslandMap, civId);
    }

    // Continuer la boucle
    lastAnimationFrame = requestAnimationFrame(gameLoop);
  }

  // Démarrer la boucle d'animation
  lastAnimationFrame = requestAnimationFrame(gameLoop);

  // Sauvegarder automatiquement toutes les secondes via SaveManager
  saveManager.startAutosave(1000);
}

// Lancer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
