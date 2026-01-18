import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';
import { CityPanelView } from './view/CityPanelView';
import { ResourceHarvest } from './model/game/ResourceHarvest';
import { RoadConstruction } from './model/game/RoadConstruction';
import { RoadController } from './controller/RoadController';
import { ResourceHarvestController } from './controller/ResourceHarvestController';
import { BuildingController } from './controller/BuildingController';
import { ResourceType } from './model/map/ResourceType';
import { HexCoord } from './model/hex/HexCoord';
import { Edge } from './model/hex/Edge';
import { Vertex } from './model/hex/Vertex';
import { BuildingType, BuildingAction } from './model/city/BuildingType';
import { City } from './model/city/City';
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
  const resourcesList = document.getElementById('resources-list') as HTMLDivElement;
  // Créer la vue du panneau de ville
  const cityPanelView = new CityPanelView('city-panel');

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

  if (!resourcesList) {
    throw new Error('Panneau de ressources introuvable');
  }

  // Créer le jeu principal
  const game = new MainGame();

  // Créer le renderer
  const renderer = new HexMapRenderer(canvas);
  
  // Configurer le renderer pour le panneau de ville
  cityPanelView.setRenderer(renderer);
  
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

    // Couleurs des ressources
    const resourceColors: Record<ResourceType, string> = {
      [ResourceType.Wood]: '#8B4513',
      [ResourceType.Brick]: '#CD5C5C',
      [ResourceType.Wheat]: '#FFD700',
      [ResourceType.Sheep]: '#90EE90',
      [ResourceType.Ore]: '#708090',
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

      const color = document.createElement('div');
      color.className = 'resource-color';
      color.style.backgroundColor = resourceColors[resourceType];

      const name = document.createElement('span');
      name.className = 'resource-name';
      name.textContent = resourceNames[resourceType];

      const countEl = document.createElement('span');
      countEl.className = 'resource-count';
      countEl.textContent = count.toString();

      item.appendChild(color);
      item.appendChild(name);
      item.appendChild(countEl);
      resourcesList.appendChild(item);
    }
  }

  // Initialiser et afficher la première carte
  game.initialize();
  const gameMap = game.getGameMap();
  if (gameMap) {
    const civId = game.getPlayerCivilizationId();
    renderer.render(gameMap, civId);
  }

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
      try {
        BuildingController.buildBuilding(buildingType, city, gameMap, vertex, playerResources);
        updateResourcesDisplay();
        updateCityPanel();
        const civId = game.getPlayerCivilizationId();
        renderer.render(gameMap, civId);
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
          // TODO: Implémenter la logique de commerce
          console.log('Commerce - à implémenter');
          return;
        }
        updateCityPanel();
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

  // Gérer les événements personnalisés du panneau
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
    if (cityPanelView.callbacks.onBuildBuilding) {
      cityPanelView.callbacks.onBuildBuilding(e.detail.buildingType, city, currentGameMap, selectedVertex);
    }
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
    if (cityPanelView.callbacks.onBuildingAction) {
      cityPanelView.callbacks.onBuildingAction(e.detail.buildingAction, e.detail.buildingType, city);
    }
  }) as EventListener);

  // Configurer le callback de rendu pour la surbrillance au survol et la mise à jour du panneau
  renderer.setRenderCallback(() => {
    const currentGameMap = game.getGameMap();
    if (currentGameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(currentGameMap, civId);
      updateCityPanel();
    }
  });

  // Mettre à jour l'affichage des ressources
  updateResourcesDisplay();

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
      // Déclencher l'effet visuel de récolte
      renderer.triggerHarvestEffect(hexCoord);
      
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
    const newGameMap = game.getGameMap();
    if (newGameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(newGameMap, civId);
      updateResourcesDisplay(); // Réinitialiser l'affichage des ressources
      updateCityPanel(); // Masquer le panneau de la ville
    }
    // Fermer le menu après l'action
    settingsMenu.classList.add('hidden');
  });


  // Initialiser le panneau (masqué par défaut)
  updateCityPanel();
}

// Lancer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
