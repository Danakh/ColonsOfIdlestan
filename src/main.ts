import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';
import { ResourceHarvest } from './model/game/ResourceHarvest';
import { RoadConstruction } from './model/game/RoadConstruction';
import { RoadController } from './controller/RoadController';
import { ResourceHarvestController } from './controller/ResourceHarvestController';
import { BuildingController } from './controller/BuildingController';
import { ResourceType } from './model/map/ResourceType';
import { HexCoord } from './model/hex/HexCoord';
import { Edge } from './model/hex/Edge';
import { Vertex } from './model/hex/Vertex';
import { City } from './model/city/City';
import { BuildingType, getBuildingTypeName, getBuildingAction, BUILDING_ACTION_NAMES, BuildingAction } from './model/city/BuildingType';
import { CityLevel } from './model/city/CityLevel';
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
  const cityPanel = document.getElementById('city-panel') as HTMLElement;
  const cityPanelTitle = document.getElementById('city-panel-title') as HTMLHeadingElement;
  const cityBuildingsList = document.getElementById('city-buildings-list') as HTMLUListElement;

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

    if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
      // Masquer le panneau si aucune ville n'est sélectionnée
      cityPanel.classList.add('hidden');
      return;
    }

    // Afficher le panneau (l'animation CSS gère la transition)
    cityPanel.classList.remove('hidden');

    // Obtenir la ville
    const city = currentGameMap.getCity(selectedVertex);
    if (!city) {
      cityPanel.classList.add('hidden');
      return;
    }

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
    cityPanelTitle.innerHTML = '';
    
    // Ajouter le sprite si disponible
    const sprite = renderer.getCitySprite(city.level);
    console.log(`Sprite pour niveau ${city.level}:`, sprite ? 'trouvé' : 'non trouvé');
    console.log(`Sprites chargés: ${renderer.areCitySpritesLoaded()}`);
    if (sprite) {
      console.log(`Sprite complete: ${sprite.complete}, naturalWidth: ${sprite.naturalWidth}, src: ${sprite.src}`);
    }
    
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const spriteImg = document.createElement('img');
      spriteImg.src = sprite.src;
      spriteImg.style.width = '32px';
      spriteImg.style.height = '32px';
      spriteImg.style.marginRight = '8px';
      spriteImg.style.verticalAlign = 'middle';
      spriteImg.style.display = 'inline-block';
      spriteImg.alt = levelName;
      cityPanelTitle.appendChild(spriteImg);
      console.log('Sprite ajouté au panneau');
    } else {
      console.warn(`Impossible d'afficher le sprite pour le niveau ${city.level}`, {
        sprite: !!sprite,
        complete: sprite?.complete,
        naturalWidth: sprite?.naturalWidth,
        src: sprite?.src
      });
    }
    
    // Ajouter le nom de la ville
    const nameSpan = document.createElement('span');
    nameSpan.textContent = levelName;
    cityPanelTitle.appendChild(nameSpan);

    // Mettre à jour la liste des bâtiments
    cityBuildingsList.innerHTML = '';
    
    const playerResources = game.getPlayerResources();
    
    // Noms des ressources en français pour l'affichage
    const resourceNames: Record<ResourceType, string> = {
      [ResourceType.Wood]: 'Bois',
      [ResourceType.Brick]: 'Brique',
      [ResourceType.Wheat]: 'Blé',
      [ResourceType.Sheep]: 'Mouton',
      [ResourceType.Ore]: 'Minerai',
    };

    // Obtenir les bâtiments constructibles avec leur statut
    const buildableBuildings = BuildingController.getBuildableBuildingsWithStatus(city, playerResources);
    
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
      cityBuildingsList.appendChild(item);
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
        
        cityBuildingsList.appendChild(item);
      }
    }
    
    // Si aucun bâtiment constructible et aucun construit
    if (buildableBuildings.length === 0 && buildings.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'empty';
      emptyItem.textContent = 'Aucun bâtiment disponible';
      cityBuildingsList.appendChild(emptyItem);
    }
  }

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

  // Gérer les clics sur les boutons de la liste des bâtiments (construction et actions)
  // Utiliser la délégation d'événements pour gérer les boutons créés dynamiquement
  cityBuildingsList.addEventListener('click', (e) => {
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

      const selectedVertex = renderer.getSelectedVertex();
      const currentGameMap = game.getGameMap();

      if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
        return;
      }

      const city = currentGameMap.getCity(selectedVertex);
      if (!city) {
        return;
      }

      const playerResources = game.getPlayerResources();

      try {
        // Construire le bâtiment (le contrôleur vérifie les conditions et consomme les ressources)
        BuildingController.buildBuilding(buildingType, city, currentGameMap, selectedVertex, playerResources);

        // Mettre à jour l'affichage des ressources
        updateResourcesDisplay();

        // Mettre à jour le panneau de la ville
        updateCityPanel();

        // Re-rendre la carte si nécessaire
        const civId = game.getPlayerCivilizationId();
        renderer.render(currentGameMap, civId);
      } catch (error) {
        // Ignorer silencieusement les erreurs de construction
        // On pourrait afficher un message à l'utilisateur si nécessaire
        console.error('Erreur lors de la construction du bâtiment:', error);
      }
    }
    
    // Gérer les actions des bâtiments construits (Améliorer, Commerce)
    if (target.classList.contains('building-action-btn')) {
      const button = target as HTMLButtonElement;
      if (button.disabled) {
        return;
      }

      const buildingAction = button.dataset.buildingAction as BuildingAction;
      if (!buildingAction) {
        return;
      }

      const selectedVertex = renderer.getSelectedVertex();
      const currentGameMap = game.getGameMap();

      if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
        return;
      }

      const city = currentGameMap.getCity(selectedVertex);
      if (!city) {
        return;
      }

      try {
        if (buildingAction === BuildingAction.Upgrade) {
          // Améliorer la ville
          if (!city.canUpgrade()) {
            return;
          }
          city.upgrade();
        } else if (buildingAction === BuildingAction.Trade) {
          // TODO: Implémenter la logique de commerce
          console.log('Commerce - à implémenter');
          return; // Ne pas mettre à jour si l'action n'est pas implémentée
        }
        
        // Mettre à jour l'affichage
        updateCityPanel();
        const civId = game.getPlayerCivilizationId();
        renderer.render(currentGameMap, civId);
      } catch (error) {
        console.error(`Erreur lors de l'action ${buildingAction}:`, error);
        // On pourrait afficher un message à l'utilisateur si nécessaire
      }
    }
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
