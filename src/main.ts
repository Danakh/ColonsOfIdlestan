import { MainGame } from './application/MainGame';
import { HexMapRenderer } from './view/HexMapRenderer';

/**
 * Point d'entrée principal de l'application web.
 */
function main(): void {
  // Récupérer les éléments DOM
  const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
  const regenerateBtn = document.getElementById('regenerate-btn') as HTMLButtonElement;

  if (!canvas) {
    throw new Error('Canvas introuvable');
  }

  if (!regenerateBtn) {
    throw new Error('Bouton de régénération introuvable');
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
  
  // Initialiser et afficher la première carte
  game.initialize();
  const gameMap = game.getGameMap();
  if (gameMap) {
    renderer.render(gameMap);
  }

  // Gérer le bouton de régénération
  regenerateBtn.addEventListener('click', () => {
    game.regenerate();
    const newGameMap = game.getGameMap();
    if (newGameMap) {
      renderer.render(newGameMap);
    }
  });
}

// Lancer l'application quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
