import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';
import { ResourceHarvest } from './model/game/ResourceHarvest';
import { RoadConstruction } from './model/game/RoadConstruction';
import { RoadController } from './controller/RoadController';
import { ResourceType } from './model/map/ResourceType';
import { HexCoord } from './model/hex/HexCoord';
import { Edge } from './model/hex/Edge';
import { Vertex } from './model/hex/Vertex';
import { City } from './model/city/City';
import { BuildingType, getBuildingTypeName } from './model/city/BuildingType';
import { CityLevel } from './model/city/CityLevel';

/**
 * Point d'entrée principal de l'application web.
 */
function main(): void {
  // Récupérer les éléments DOM
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  const regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;
  const resourcesList = document.getElementById('resources-list') as HTMLDivElement;
  const cityPanel = document.getElementById('city-panel') as HTMLElement;
  const cityPanelTitle = document.getElementById('city-panel-title') as HTMLHeadingElement;
  const cityBuildingsList = document.getElementById('city-buildings-list') as HTMLUListElement;
  const cityUpgradeBtn = document.getElementById('city-upgrade-btn') as HTMLButtonElement;
  const cityTradeBtn = document.getElementById('city-trade-btn') as HTMLButtonElement;

  if (!canvas) {
    throw new Error('Canvas introuvable');
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

    const wasVisible = !cityPanel.classList.contains('hidden');

    if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
      // Masquer le panneau si aucune ville n'est sélectionnée
      cityPanel.classList.add('hidden');
      // Redimensionner le canvas si le panneau était visible
      if (wasVisible) {
        renderer.resize();
        const civId = game.getPlayerCivilizationId();
        if (currentGameMap) {
          renderer.render(currentGameMap, civId);
        }
      }
      return;
    }

    // Afficher le panneau
    const isNowVisible = cityPanel.classList.contains('hidden');
    cityPanel.classList.remove('hidden');
    
    // Redimensionner le canvas si le panneau vient d'apparaître
    if (!wasVisible || isNowVisible) {
      // Utiliser setTimeout pour laisser le navigateur calculer la largeur du panneau
      setTimeout(() => {
        renderer.resize();
        const civId = game.getPlayerCivilizationId();
        if (currentGameMap) {
          renderer.render(currentGameMap, civId);
        }
      }, 0);
    }

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

    // Mettre à jour le titre
    const levelName = cityLevelNames[city.level] || `Niveau ${city.level}`;
    cityPanelTitle.textContent = `${levelName}`;

    // Mettre à jour la liste des bâtiments
    cityBuildingsList.innerHTML = '';
    const buildings = city.getBuildings();

    if (buildings.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'empty';
      emptyItem.textContent = 'Aucun bâtiment construit';
      cityBuildingsList.appendChild(emptyItem);
    } else {
      for (const buildingType of buildings) {
        const item = document.createElement('li');
        item.textContent = getBuildingTypeName(buildingType);
        cityBuildingsList.appendChild(item);
      }
    }

    // Mettre à jour les boutons d'actions
    cityUpgradeBtn.disabled = !city.canUpgrade();
    // Pour l'instant, le bouton Trade est toujours activé (à implémenter plus tard)
    cityTradeBtn.disabled = false;
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

    try {
      // Vérifier si on peut récolter
      if (ResourceHarvest.canHarvest(hexCoord, currentGameMap, civId)) {
        // Récolter la ressource
        ResourceHarvest.harvest(hexCoord, currentGameMap, civId, playerResources);
        
        // Mettre à jour l'affichage des ressources
        updateResourcesDisplay();
        
        // Optionnel: Re-rendre la carte pour un feedback visuel
        renderer.render(currentGameMap, civId);
      }
    } catch (error) {
      // Ignorer silencieusement les erreurs de récolte (hexagone non récoltable)
      // On pourrait afficher un message à l'utilisateur si nécessaire
    }
  });

  // Gérer le bouton de régénération
  regenerateBtn.addEventListener('click', () => {
    game.regenerate();
    const newGameMap = game.getGameMap();
    if (newGameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(newGameMap, civId);
      updateResourcesDisplay(); // Réinitialiser l'affichage des ressources
      updateCityPanel(); // Masquer le panneau de la ville
    }
  });

  // Gérer le bouton d'amélioration de ville
  cityUpgradeBtn.addEventListener('click', () => {
    const selectedVertex = renderer.getSelectedVertex();
    const currentGameMap = game.getGameMap();

    if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
      return;
    }

    const city = currentGameMap.getCity(selectedVertex);
    if (!city || !city.canUpgrade()) {
      return;
    }

    try {
      // Améliorer la ville
      city.upgrade();
      
      // Mettre à jour l'affichage
      updateCityPanel();
      const civId = game.getPlayerCivilizationId();
      renderer.render(currentGameMap, civId);
    } catch (error) {
      console.error('Erreur lors de l\'amélioration de la ville:', error);
      // On pourrait afficher un message à l'utilisateur si nécessaire
    }
  });

  // Gérer le bouton de commerce (à implémenter plus tard)
  cityTradeBtn.addEventListener('click', () => {
    // TODO: Implémenter la logique de commerce
    console.log('Commerce - à implémenter');
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
