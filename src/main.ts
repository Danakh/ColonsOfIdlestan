import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';
import { ResourceHarvest } from './model/game/ResourceHarvest';
import { ResourceType } from './model/map/ResourceType';
import { HexCoord } from './model/hex/HexCoord';

/**
 * Point d'entrée principal de l'application web.
 */
function main(): void {
  // Récupérer les éléments DOM
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  const regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;
  const resourcesList = document.getElementById('resources-list') as HTMLDivElement;

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
      renderer.render(gameMap);
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
    renderer.render(gameMap);
  }

  // Mettre à jour l'affichage des ressources
  updateResourcesDisplay();

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
        renderer.render(currentGameMap);
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
      renderer.render(newGameMap);
      updateResourcesDisplay(); // Réinitialiser l'affichage des ressources
    }
  });
}

// Lancer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
