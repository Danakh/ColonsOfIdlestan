import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';
import { CityPanelView } from './view/CityPanelView';
import { TradePanelView } from './view/TradePanelView';
import { ResourceSprites } from './view/ResourceSprites';
import { ResourceHarvest } from './model/game/ResourceHarvest';
import { RoadConstruction } from './model/game/RoadConstruction';
import { RoadController } from './controller/RoadController';
import { OutpostController } from './controller/OutpostController';
import { ResourceHarvestController } from './controller/ResourceHarvestController';
import { BuildingController } from './controller/BuildingController';
import { TradeController } from './controller/TradeController';
import { BuildingProductionController } from './controller/BuildingProductionController';
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
  const cheatBtn = document.getElementById('cheat-btn') as HTMLButtonElement;
  const resourcesList = document.getElementById('resources-list') as HTMLDivElement;
  // Créer la vue du panneau de ville
  const cityPanelView = new CityPanelView('city-panel');

  // Créer la vue du panneau de commerce
  const tradePanelView = new TradePanelView('trade-panel');

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

  if (!cheatBtn) {
    throw new Error('Bouton cheat introuvable');
  }

  if (!resourcesList) {
    throw new Error('Panneau de ressources introuvable');
  }

  // Créer le jeu principal
  const game = new MainGame();

  // Créer le renderer
  const renderer = new HexMapRenderer(canvas);
  
  // Configurer le renderer pour le panneau de ville
  cityPanelView.setRenderer(renderer);
  
  // Charger les sprites de ressources
  const resourceSprites = new ResourceSprites();
  resourceSprites.onAllLoaded(() => {
    // Mettre à jour l'affichage des ressources une fois les sprites chargés
    updateResourcesDisplay();
  });
  resourceSprites.load();

  // Configurer les sprites de ressources pour le panneau de commerce
  tradePanelView.setResourceSprites(resourceSprites);
  
  // Redimensionner le canvas au chargement et au redimensionnement
  renderer.resize();
  window.addEventListener('resize', () => {
    renderer.resize();
    // Rendu manuel supprimé - à réactiver si nécessaire
  });
  
  /**
   * Met à jour l'affichage des ressources du joueur.
   */
  function updateResourcesDisplay(): void {
    if (!resourcesList) return;

    const playerResources = game.getPlayerResources();
    
    // Noms des ressources en français
    const resourceNames: Record<ResourceType, string> = {
      [ResourceType.Wood]: 'Bois',
      [ResourceType.Brick]: 'Brique',
      [ResourceType.Wheat]: 'Blé',
      [ResourceType.Sheep]: 'Mouton',
      [ResourceType.Ore]: 'Minerai',
    };

    // Ordre d'affichage des ressources
    const resourceOrder: ResourceType[] = [
      ResourceType.Wood,
      ResourceType.Brick,
      ResourceType.Wheat,
      ResourceType.Sheep,
      ResourceType.Ore,
    ];

    // Vider la liste
    resourcesList.innerHTML = '';

    // Ajouter toutes les ressources (même à 0)
    for (const resourceType of resourceOrder) {
      const count = playerResources.getResource(resourceType);
      
      const item = document.createElement('div');
      item.className = 'resource-item';

      // Utiliser le sprite si disponible, sinon fallback sur la couleur
      const sprite = resourceSprites.getSprite(resourceType);
      const spriteReady = resourceSprites.isSpriteReady(resourceType);
      
      if (spriteReady && sprite) {
        const spriteImg = document.createElement('img');
        spriteImg.src = sprite.src;
        spriteImg.className = 'resource-sprite';
        spriteImg.alt = resourceNames[resourceType];
        spriteImg.style.width = '24px';
        spriteImg.style.height = '24px';
        spriteImg.style.objectFit = 'contain';
        item.appendChild(spriteImg);
      } else {
        // Fallback : carré de couleur si le sprite n'est pas encore chargé
        const color = document.createElement('div');
        color.className = 'resource-color';
        // Couleurs de fallback
        const resourceColors: Record<ResourceType, string> = {
          [ResourceType.Wood]: '#8B4513',
          [ResourceType.Brick]: '#CD5C5C',
          [ResourceType.Wheat]: '#FFD700',
          [ResourceType.Sheep]: '#90EE90',
          [ResourceType.Ore]: '#708090',
        };
        color.style.backgroundColor = resourceColors[resourceType];
        item.appendChild(color);
      }

      const name = document.createElement('span');
      name.className = 'resource-name';
      name.textContent = resourceNames[resourceType];

      const countEl = document.createElement('span');
      countEl.className = 'resource-count';
      countEl.textContent = count.toString();
      
      item.appendChild(name);
      item.appendChild(countEl);
      resourcesList.appendChild(item);
    }
  }

  // Initialiser et afficher la première carte
  game.initialize();
  // Rendu manuel supprimé - à réactiver si nécessaire

  /**
   * Met à jour l'affichage du panneau de la ville sélectionnée.
   */
  function updateCityPanel(): void {
    const selectedVertex = renderer.getSelectedVertex();
    const currentGameMap = game.getGameMap();
    const city = selectedVertex && currentGameMap && currentGameMap.hasCity(selectedVertex)
      ? currentGameMap.getCity(selectedVertex) || null
      : null;
    const playerResources = game.getPlayerResources();

    cityPanelView.update(selectedVertex, currentGameMap, city, playerResources);
  }

  // Configurer les callbacks du panneau de ville
  cityPanelView.setCallbacks({
    onBuildBuilding: (buildingType: BuildingType, city: City, gameMap: GameMap, vertex: Vertex) => {
      const playerResources = game.getPlayerResources();
      const gameClock = game.getGameClock();
      try {
        BuildingController.buildBuilding(buildingType, city, gameMap, vertex, playerResources);
        
        // Si c'est un bâtiment de ressource, initialiser son temps de production
        const resourceBuildings = getResourceProductionBuildings();
        if (resourceBuildings.includes(buildingType)) {
          const currentTime = gameClock.getCurrentTime();
          city.setBuildingProductionTime(buildingType, currentTime);
        }
        
        updateResourcesDisplay();
        updateCityPanel();
        // Rendu manuel supprimé - à réactiver si nécessaire
      } catch (error) {
        console.error('Erreur lors de la construction du bâtiment:', error);
      }
    },
    onBuildingAction: (action: BuildingAction, buildingType: BuildingType, city: City) => {
      try {
        if (action === BuildingAction.Upgrade) {
          if (!city.canUpgrade()) {
            return;
          }
          city.upgrade();
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
        }
        updateCityPanel();
        // Rendu manuel supprimé - à réactiver si nécessaire
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
    cityPanelView.handleBuildingAction(e.detail.buildingAction, e.detail.buildingType, city);
  }) as EventListener);

  // Callback de rendu désactivé - à réactiver si nécessaire
  // renderer.setRenderCallback(() => { ... });

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
      
      // Rendu manuel supprimé - à réactiver si nécessaire
      
      // Mettre à jour le panneau de ville si une ville était sélectionnée
      updateCityPanel();
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
      
      // Rendu manuel supprimé - à réactiver si nécessaire
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
    game.regenerate();
    // Réinitialiser le temps de référence pour la boucle d'animation
    gameStartTime = null;
    
    // Rendu manuel supprimé - à réactiver si nécessaire
    updateResourcesDisplay(); // Réinitialiser l'affichage des ressources
    updateCityPanel(); // Masquer le panneau de la ville
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
    
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });


  // Initialiser le panneau (masqué par défaut)
  updateCityPanel();

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
    // Utiliser requestAnimationFrame pour différer les mises à jour visuelles et laisser
    // les événements utilisateur se traiter
    if (productionResults.length > 0) {
      requestAnimationFrame(() => {
        // Déclencher les animations pour chaque production
        for (const result of productionResults) {
          // Effet visuel sur l'hex récolté (automatique, donc sans effet de réduction)
          renderer.triggerHarvestEffect(result.hexCoord, true);
          
          // Animation de la particule de ressource vers la ville ayant déclenché le harvest
          renderer.triggerResourceHarvestAnimation(
            result.hexCoord,
            result.resourceType,
            result.cityVertex
          );
        }

        // Mettre à jour l'affichage des ressources
        updateResourcesDisplay();
      });
    }
  }

  // Boucle principale d'animation pour gérer le temps et la production automatique
  let lastAnimationFrame: number | null = null;
  let gameStartTime: number | null = null;

  /**
   * Boucle d'animation principale qui gère le temps et la production automatique.
   * Utilise un intervalle pour ne pas surcharger le système et laisser les événements utilisateur se traiter.
   */
  let lastProcessTime: number = 0;
  const PROCESS_INTERVAL_MS = 200; // Traiter la production automatique toutes les 200ms (plus espacé)

  function gameLoop(timestamp: number): void {
    // Initialiser le temps de référence au premier appel
    if (gameStartTime === null) {
      gameStartTime = timestamp;
      lastProcessTime = timestamp;
    }

    // Calculer le temps écoulé depuis le début en secondes
    const timeSeconds = (timestamp - gameStartTime) / 1000;

    // Mettre à jour l'horloge de jeu
    game.updateGameTime(timeSeconds);

    // Traiter la production automatique seulement si l'intervalle est écoulé
    // Utiliser setTimeout pour différer le traitement et laisser les événements utilisateur se traiter
    if (timestamp - lastProcessTime >= PROCESS_INTERVAL_MS) {
      // Différer le traitement pour laisser le navigateur traiter les événements utilisateur
      setTimeout(() => {
        processAutomaticBuildingProduction();
      }, 0);
      lastProcessTime = timestamp;
    }

    // Continuer la boucle
    lastAnimationFrame = requestAnimationFrame(gameLoop);
  }

  // Démarrer la boucle d'animation
  lastAnimationFrame = requestAnimationFrame(gameLoop);
}

// Lancer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
