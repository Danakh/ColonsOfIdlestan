import { PlayerResources } from '../model/game/PlayerResources';
import { ResourceType } from '../model/map/ResourceType';
import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { calculateInventoryCapacity } from '../model/game/InventoryCapacity';
import { calculateCivilizationPoints, hasLibrary } from '../model/game/CivilizationPoints';
import { ResourceSprites } from './ResourceSprites';

/**
 * Vue pour l'affichage de l'inventaire des ressources du joueur.
 */
export class InventoryView {
  private resourcesListElement: HTMLElement;
  private resourceSprites: ResourceSprites;

  // Noms des ressources en français
  private static readonly RESOURCE_NAMES: Record<ResourceType, string> = {
    [ResourceType.Wood]: 'Bois',
    [ResourceType.Brick]: 'Brique',
    [ResourceType.Wheat]: 'Blé',
    [ResourceType.Sheep]: 'Mouton',
    [ResourceType.Ore]: 'Minerai',
  };

  // Ordre d'affichage des ressources
  private static readonly RESOURCE_ORDER: ResourceType[] = [
    ResourceType.Wood,
    ResourceType.Brick,
    ResourceType.Wheat,
    ResourceType.Sheep,
    ResourceType.Ore,
  ];

  // Couleurs de fallback pour les ressources
  private static readonly RESOURCE_COLORS: Record<ResourceType, string> = {
    [ResourceType.Wood]: '#8B4513',
    [ResourceType.Brick]: '#CD5C5C',
    [ResourceType.Wheat]: '#FFD700',
    [ResourceType.Sheep]: '#90EE90',
    [ResourceType.Ore]: '#708090',
  };

  /**
   * Crée une nouvelle vue d'inventaire.
   * @param resourcesListId - L'ID de l'élément DOM qui contiendra la liste des ressources
   * @param resourceSprites - Les sprites de ressources pour l'affichage
   */
  constructor(resourcesListId: string, resourceSprites: ResourceSprites) {
    const element = document.getElementById(resourcesListId);
    if (!element) {
      throw new Error(`Élément avec l'ID "${resourcesListId}" introuvable`);
    }
    this.resourcesListElement = element;
    this.resourceSprites = resourceSprites;
  }

  /**
   * Met à jour l'affichage des ressources du joueur.
   * @param playerResources - Les ressources du joueur
   * @param gameMap - La carte de jeu (peut être null si pas encore initialisée)
   * @param civId - L'identifiant de la civilisation du joueur
   */
  updateDisplay(
    playerResources: PlayerResources,
    gameMap: GameMap | null,
    civId: CivilizationId
  ): void {
    // Calculer la capacité maximale d'inventaire
    const maxCapacity = gameMap ? calculateInventoryCapacity(gameMap, civId) : 10;

    // Vider la liste
    this.resourcesListElement.innerHTML = '';

    // Ajouter toutes les ressources (même à 0)
    for (const resourceType of InventoryView.RESOURCE_ORDER) {
      const count = playerResources.getResource(resourceType);
      const item = this.createResourceItem(resourceType, count, maxCapacity);
      this.resourcesListElement.appendChild(item);
    }

    // Afficher les points de civilisation seulement si une bibliothèque existe
    if (gameMap && hasLibrary(gameMap, civId)) {
      const points = calculateCivilizationPoints(gameMap, civId);
      const pointsElement = this.createCivilizationPointsElement(points);
      this.resourcesListElement.appendChild(pointsElement);
    }
  }

  /**
   * Crée un élément DOM pour afficher les points de civilisation.
   * @param points - Le nombre de points de civilisation
   * @returns L'élément DOM créé
   */
  private createCivilizationPointsElement(points: number): HTMLElement {
    const pointsContainer = document.createElement('div');
    pointsContainer.className = 'civilization-points';

    const pointsLabel = document.createElement('span');
    pointsLabel.className = 'civilization-points-label';
    pointsLabel.textContent = 'Points de civilisation';

    const pointsValue = document.createElement('span');
    pointsValue.className = 'civilization-points-value';
    pointsValue.textContent = points.toString();

    pointsContainer.appendChild(pointsLabel);
    pointsContainer.appendChild(pointsValue);
    return pointsContainer;
  }

  /**
   * Crée un élément DOM pour une ressource.
   * @param resourceType - Le type de ressource
   * @param count - La quantité actuelle
   * @param maxCapacity - La capacité maximale
   * @returns L'élément DOM créé
   */
  private createResourceItem(
    resourceType: ResourceType,
    count: number,
    maxCapacity: number
  ): HTMLElement {
    const item = document.createElement('div');
    item.className = 'resource-item';

    // Utiliser le sprite si disponible, sinon fallback sur la couleur
    const sprite = this.resourceSprites.getSprite(resourceType);
    const spriteReady = this.resourceSprites.isSpriteReady(resourceType);

    if (spriteReady && sprite) {
      const spriteImg = document.createElement('img');
      spriteImg.src = sprite.src;
      spriteImg.className = 'resource-sprite';
      spriteImg.alt = InventoryView.RESOURCE_NAMES[resourceType];
      spriteImg.style.width = '24px';
      spriteImg.style.height = '24px';
      spriteImg.style.objectFit = 'contain';
      item.appendChild(spriteImg);
    } else {
      // Fallback : carré de couleur si le sprite n'est pas encore chargé
      const color = document.createElement('div');
      color.className = 'resource-color';
      color.style.backgroundColor = InventoryView.RESOURCE_COLORS[resourceType];
      item.appendChild(color);
    }

    const name = document.createElement('span');
    name.className = 'resource-name';
    name.textContent = InventoryView.RESOURCE_NAMES[resourceType];

    const countEl = document.createElement('span');
    countEl.className = 'resource-count';
    countEl.textContent = `${count} / ${maxCapacity}`;

    item.appendChild(name);
    item.appendChild(countEl);
    return item;
  }
}
