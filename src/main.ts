import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';
import { CityPanelView } from './view/CityPanelView';
import { TradePanelView } from './view/TradePanelView';
import { PortSpecializationPanelView } from './view/PortSpecializationPanelView';
import { AutomationPanelView, AutomationType } from './view/AutomationPanelView';
import { ResourceSprites } from './view/ResourceSprites';
import { InventoryView } from './view/InventoryView';
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
import { GameMap } from './model/map/GameMap';
import { APP_VERSION, APP_NAME } from './config/version';

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

  // Récupérer les éléments DOM
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  const settingsMenu = document.getElementById('settings-menu') as HTMLElement;
  const regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
  const cheatBtn = document.getElementById('cheat-btn') as HTMLButtonElement;
  const showHexCoordsBtn = document.getElementById('show-hex-coords-btn') as HTMLButtonElement;
  // Créer la vue du panneau de ville
  const cityPanelView = new CityPanelView('city-panel');

  // Créer la vue du panneau de commerce
  const tradePanelView = new TradePanelView('trade-panel');

  // Créer la vue du panneau de spécialisation du port
  const portSpecializationPanelView = new PortSpecializationPanelView('port-specialization-panel');

  // Créer la vue du panneau d'automatisation
  const automationPanelView = new AutomationPanelView('automation-panel');

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

  // Créer le jeu principal
  const game = new MainGame();
  // Donner la civilisation du joueur au panneau (bouton Commerce global)
  cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());

  // Créer le renderer
  const renderer = new HexMapRenderer(canvas);
  
  // Configurer le renderer pour le panneau de ville
  cityPanelView.setRenderer(renderer);
  cityPanelView.bind(renderer, {
    getGameMap: () => game.getGameMap(),
    getPlayerResources: () => game.getPlayerResources(),
  });
  
  // Charger les sprites de ressources
  const resourceSprites = new ResourceSprites();
  
  // Créer la vue de l'inventaire
  const inventoryView = new InventoryView('resources-list', resourceSprites);
  
  resourceSprites.onAllLoaded(() => {
    // Mettre à jour l'affichage des ressources une fois les sprites chargés
    updateResourcesDisplay();
  });
  resourceSprites.load();

  // Configurer les sprites de ressources pour le panneau de commerce
  tradePanelView.setResourceSprites(resourceSprites);

  // Configurer les sprites de ressources pour le panneau de spécialisation
  portSpecializationPanelView.setResourceSprites(resourceSprites);
  
  // Redimensionner le canvas au chargement et au redimensionnement
  renderer.resize();
  window.addEventListener('resize', () => {
    renderer.resize();
    const gameMap = game.getGameMap();
    if (gameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(gameMap, civId);
    }
  });
  
  /**
   * Met à jour l'affichage des ressources du joueur.
   */
  function updateResourcesDisplay(): void {
    const playerResources = game.getPlayerResources();
    const gameMap = game.getGameMap();
    const civId = game.getPlayerCivilizationId();
    inventoryView.updateDisplay(playerResources, gameMap, civId);
    // Mettre à jour les boutons du footer
    if (gameMap) {
      cityPanelView.updateFooter();
    }
  }

  // Clé pour la sauvegarde automatique dans localStorage
  const AUTOSAVE_KEY = 'colons-of-idlestan-autosave';

  /**
   * Sauvegarde automatique de la partie dans localStorage.
   */
  function autoSave(): void {
    try {
      const serialized = game.saveGame();
      localStorage.setItem(AUTOSAVE_KEY, serialized);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde automatique:', error);
    }
  }

  /**
   * Charge automatiquement la partie depuis localStorage si elle existe.
   */
  function autoLoad(): boolean {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        console.log('Chargement automatique de la sauvegarde...');
        game.loadGame(saved);
        console.log('Sauvegarde chargée avec succès');
        return true;
      } else {
        console.log('Aucune sauvegarde trouvée dans localStorage');
      }
    } catch (error) {
      console.error('Erreur lors du chargement automatique:', error);
      // En cas d'erreur, on supprime la sauvegarde corrompue
      localStorage.removeItem(AUTOSAVE_KEY);
    }
    return false;
  }

  // Boucle principale d'animation pour gérer le temps et la production automatique
  let lastAnimationFrame: number | null = null;
  let gameStartTime: number | null = null;

  // Charger automatiquement la sauvegarde si elle existe, sinon créer une nouvelle partie
  const loaded = autoLoad();
  if (!loaded) {
    game.newGame();
  } else {
    // Réinitialiser le temps de référence pour la boucle d'animation après le chargement
    // Cela permettra à la boucle de repartir correctement
    gameStartTime = null;
    // Sauvegarder immédiatement après le chargement pour s'assurer qu'on a une sauvegarde valide
    autoSave();
    // Mettre à jour la civilisation du joueur dans le panneau de ville (peut avoir changé lors du chargement)
    cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());
  }
  
  const gameMap = game.getGameMap();
  if (gameMap) {
    const civId = game.getPlayerCivilizationId();
    renderer.render(gameMap, civId);
  }
  
  // Mettre à jour l'affichage après le chargement
  updateResourcesDisplay();
  cityPanelView.refreshNow();
  // Mettre à jour les boutons du footer
  cityPanelView.updateFooter();

  // Configurer les callbacks du panneau de ville
  cityPanelView.setCallbacks({
    onPanelUpdated: (city: City | null) => {
      // Mettre à jour le bouton d'automatisation quand le panneau de ville est mis à jour
      automationPanelView.updateAutomationButton(city);
    },
    onBuildBuilding: (buildingType: BuildingType, city: City, gameMap: GameMap, vertex: Vertex) => {
      const playerResources = game.getPlayerResources();
      const gameClock = game.getGameClock();
      try {
        BuildingController.buildBuilding(buildingType, city, gameMap, vertex, playerResources);
        
        // Si c'est un bâtiment de ressource, initialiser son temps de production
        const resourceBuildings = getResourceProductionBuildings();
        if (resourceBuildings.includes(buildingType)) {
          const currentTime = gameClock.getCurrentTime();
          city.getBuilding(buildingType)?.setProductionTimeSeconds(currentTime);
        }
        
        updateResourcesDisplay();
        cityPanelView.refreshNow();
        const civId = game.getPlayerCivilizationId();
        renderer.render(gameMap, civId);
      } catch (error) {
        console.error('Erreur lors de la construction du bâtiment:', error);
      }
    },
    onBuildingAction: (action: BuildingAction, buildingType: BuildingType, city: City) => {
      try {
        if (action === BuildingAction.Upgrade) {
          const playerResources = game.getPlayerResources();
          const currentGameMap = game.getGameMap();
          if (!currentGameMap) {
            console.error('Carte de jeu non disponible');
            return;
          }
          BuildingController.upgradeBuilding(buildingType, city, currentGameMap, playerResources);
          updateResourcesDisplay();
          cityPanelView.refreshNow();
          const civId = game.getPlayerCivilizationId();
          renderer.render(currentGameMap, civId);
        } else if (action === BuildingAction.Trade) {
          // Mettre à jour le contexte de jeu pour le panneau de commerce
          const currentGameMap = game.getGameMap();
          if (currentGameMap) {
            const civId = game.getPlayerCivilizationId();
            tradePanelView.setGameContext(currentGameMap, civId);
          }
          
          // Ouvrir le panneau de commerce
          const playerResources = game.getPlayerResources();
          tradePanelView.show(playerResources);
          return; // Ne pas mettre à jour le panneau de ville ni re-rendre
        } else if (action === BuildingAction.Specialization) {
          // Ouvrir le panneau de spécialisation avec les ressources déjà utilisées
          const selectedVertex = renderer.getSelectedVertex();
          const currentGameMap = game.getGameMap();
          if (selectedVertex && currentGameMap && currentGameMap.hasCity(selectedVertex)) {
            const city = currentGameMap.getCity(selectedVertex);
            const civId = game.getPlayerCivilizationId();
            if (city && civId) {
              const blockedResources = TradeController.getUsedSpecializations(civId, currentGameMap, city);
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
          const currentGameMap = game.getGameMap();
          const civId = game.getPlayerCivilizationId();

          if (!currentGameMap || !civId) {
            console.error('Carte de jeu ou civilisation non disponible');
            return;
          }

          // Vérifier si l'action peut être activée
          if (!PrestigeController.canActivatePrestige(civId, currentGameMap)) {
            const reason = PrestigeController.getPrestigeRestrictionReason(civId, currentGameMap);
            alert(`Prestige non disponible: ${reason}`);
            return;
          }

          // Activer l'action Prestige
          const result = PrestigeController.activatePrestige(civId, currentGameMap);
          
          if (result.success && result.civilizationPointsGained !== undefined) {
            // Les points de civilisation sont ajoutés au CivilizationState
            // (à implémenter lors de la migration vers CivilizationState)
            alert(result.message);
            updateResourcesDisplay();
            cityPanelView.refreshNow();
            renderer.render(currentGameMap, civId);
            autoSave();
          } else {
            alert(result.message);
          }
          return;
        }
        cityPanelView.refreshNow();
        const currentGameMap = game.getGameMap();
        if (currentGameMap) {
          const civId = game.getPlayerCivilizationId();
          renderer.render(currentGameMap, civId);
        }
      } catch (error) {
        console.error(`Erreur lors de l'action ${action}:`, error);
      }
    },
  });

  // Configurer les callbacks du panneau de commerce
  tradePanelView.setCallbacks({
    onTrade: (offered: Map<ResourceType, number>, requested: Map<ResourceType, number>) => {
      const currentGameMap = game.getGameMap();
      if (!currentGameMap) {
        return;
      }

      const civId = game.getPlayerCivilizationId();
      const playerResources = game.getPlayerResources();

      try {
        // Effectuer l'échange batch via le contrôleur
        TradeController.performBatchTrade(offered, requested, civId, currentGameMap, playerResources);

        // Mettre à jour l'affichage des ressources
        updateResourcesDisplay();
        cityPanelView.scheduleRefresh();

        // Fermer le panneau de commerce
        tradePanelView.hide();
      } catch (error) {
        console.error('Erreur lors de l\'échange:', error);
        // On pourrait afficher un message à l'utilisateur si nécessaire
        // Pour l'instant, on garde le panneau ouvert pour que l'utilisateur puisse corriger
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
      const currentGameMap = game.getGameMap();
      if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
        return;
      }
      const city = currentGameMap.getCity(selectedVertex);
      if (!city) {
        return;
      }

      // Vérifier que la ressource n'est pas déjà utilisée par un autre port
      const civId = game.getPlayerCivilizationId();
      if (civId) {
        const blockedResources = TradeController.getUsedSpecializations(civId, currentGameMap, city);
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
          renderer.render(currentGameMap, civId);
          
          // Sauvegarder le jeu
          autoSave();
          
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
    getGameMap: () => game.getGameMap(),
    getPlayerCivilizationId: () => game.getPlayerCivilizationId(),
    getCivilization: (civId) => game.getGameState().getCivilization(civId),
    updateResourcesDisplay: () => updateResourcesDisplay(),
    refreshCityPanel: () => cityPanelView.refreshNow(),
    getCurrentCity: () => cityPanelView.getCurrentCity(),
    renderMap: (gameMap, civId) => renderer.render(gameMap, civId),
    autoSave: () => autoSave(),
  });

  // Gérer les événements personnalisés du panneau de ville
  const panelElement = cityPanelView.getPanelElement();
  
  panelElement.addEventListener('buildBuilding', ((e: CustomEvent) => {
    const selectedVertex = renderer.getSelectedVertex();
    const currentGameMap = game.getGameMap();
    if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
      return;
    }
    const city = currentGameMap.getCity(selectedVertex);
    if (!city) {
      return;
    }
    cityPanelView.handleBuildBuilding(e.detail.buildingType, city, currentGameMap, selectedVertex);
  }) as EventListener);

  // Bouton Commerce global (footer du panneau de ville)
  panelElement.addEventListener('openTrade', (() => {
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }
    const civId = game.getPlayerCivilizationId();
    tradePanelView.setGameContext(currentGameMap, civId);
    tradePanelView.show(game.getPlayerResources());
  }) as EventListener);


  panelElement.addEventListener('buildingAction', ((e: CustomEvent) => {
    const selectedVertex = renderer.getSelectedVertex();
    const currentGameMap = game.getGameMap();
    if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
      return;
    }
    const city = currentGameMap.getCity(selectedVertex);
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
    const currentGameMap = game.getGameMap();
    if (currentGameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(currentGameMap, civId);
    }
  });

  // Mettre à jour l'affichage des ressources
  updateResourcesDisplay();

  // Gérer le clic sur les vertices constructibles pour construire des avant-postes
  renderer.setOnOutpostVertexClick((vertex: Vertex) => {
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }

    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();

    try {
      // Construire l'avant-poste (le contrôleur vérifie les conditions et consomme les ressources)
      OutpostController.buildOutpost(vertex, civId, currentGameMap, playerResources);
      
      // Mettre à jour l'affichage des ressources
      updateResourcesDisplay();
      cityPanelView.scheduleRefresh();
      
      // Re-rendre la carte pour afficher la nouvelle ville
      renderer.render(currentGameMap, civId);
      
      // Mettre à jour le panneau de ville si une ville était sélectionnée
      cityPanelView.refreshNow();
    } catch (error) {
      // Ignorer silencieusement les erreurs de construction
      // On pourrait afficher un message à l'utilisateur si nécessaire
    }
  });

  // Gérer le clic sur les routes (edges) pour les construire
  renderer.setOnEdgeClick((edge: Edge) => {
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }

    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();

    try {
      // Construire la route (le contrôleur vérifie les conditions et consomme les ressources)
      RoadController.buildRoad(edge, civId, currentGameMap, playerResources);
      
      // Mettre à jour l'affichage des ressources
      updateResourcesDisplay();
      cityPanelView.scheduleRefresh();
      
      // Re-rendre la carte pour afficher la nouvelle route
      renderer.render(currentGameMap, civId);
    } catch (error) {
      // Ignorer silencieusement les erreurs de construction
      // On pourrait afficher un message à l'utilisateur si nécessaire
    }
  });

  // Gérer le clic sur les hexagones pour récolter les ressources
  renderer.setOnHexClick((hexCoord: HexCoord) => {
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }

    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();

    // Récolter la ressource via le contrôleur (qui gère la limitation de taux)
    const result = ResourceHarvestController.harvest(hexCoord, civId, currentGameMap, playerResources);
    
    if (result.success && result.cityVertex) {
      // Déclencher l'effet visuel de récolte (manuel, donc avec effet de réduction)
      renderer.triggerHarvestEffect(hexCoord, false);
      
      // Obtenir le type de ressource récoltée pour l'animation
      const hexType = currentGameMap.getHexType(hexCoord);
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
    autoSave();
    
    const newGameMap = game.getGameMap();
    if (newGameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(newGameMap, civId);
      updateResourcesDisplay(); // Réinitialiser l'affichage des ressources
      cityPanelView.refreshNow(); // Mettre à jour le panneau de la ville
    }
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });

  // Gérer le bouton d'export dans le menu
  exportBtn.addEventListener('click', () => {
    try {
      const serialized = game.saveGame();
      const blob = new Blob([serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `colons-of-idlestan-save-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export de la partie');
    }
    
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });

  // Gérer le bouton d'import dans le menu
  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          game.loadGame(content);
          
          // Sauvegarder immédiatement après l'import
          autoSave();
          
          // Réinitialiser le temps de référence pour la boucle d'animation
          gameStartTime = null;
          
          // Mettre à jour la civilisation du joueur dans le panneau de ville (peut avoir changé lors du chargement)
          cityPanelView.setPlayerCivilizationId(game.getPlayerCivilizationId());
          
          // Mettre à jour l'affichage
          const newGameMap = game.getGameMap();
          if (newGameMap) {
            const civId = game.getPlayerCivilizationId();
            renderer.render(newGameMap, civId);
            updateResourcesDisplay();
            cityPanelView.refreshNow();
            // Mettre à jour les boutons du footer avec la civilisation chargée
            cityPanelView.updateFooter();
          }
        } catch (error) {
          console.error('Erreur lors de l\'import:', error);
          alert('Erreur lors de l\'import de la partie. Le fichier est peut-être invalide.');
        }
      };
      
      reader.readAsText(file);
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
    const gameMap = game.getGameMap();
    if (gameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(gameMap, civId);
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
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }

    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();
    const gameClock = game.getGameClock();

    // Traiter la production automatique via le contrôleur
    const productionResults = BuildingProductionController.processAutomaticProduction(
      civId,
      currentGameMap,
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
    const currentGameMap = game.getGameMap();
    if (currentGameMap) {
      const civId = game.getPlayerCivilizationId();
      const playerResources = game.getPlayerResources();
      const civilization = game.getGameState().getCivilization(civId);
      AutomationController.processAllAutomations(civId, civilization, currentGameMap, playerResources);
      
      // Mettre à jour l'affichage si des automatisations ont été exécutées
      updateResourcesDisplay();
      cityPanelView.scheduleRefresh();
      
      // Re-rendre la carte si nécessaire
      renderer.render(currentGameMap, civId);
    }

    // Continuer la boucle
    lastAnimationFrame = requestAnimationFrame(gameLoop);
  }

  // Démarrer la boucle d'animation
  lastAnimationFrame = requestAnimationFrame(gameLoop);

  // Sauvegarder automatiquement toutes les secondes
  setInterval(() => {
    autoSave();
  }, 1000);
}

// Lancer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
