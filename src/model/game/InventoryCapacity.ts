import { GameMap } from '../map/GameMap';
import { CivilizationId } from '../map/CivilizationId';
import { CityLevel } from '../city/CityLevel';
import { BuildingType } from '../city/BuildingType';

/**
 * Calcule la capacité d'inventaire maximale pour une civilisation.
 * 
 * Formule : 10 * (niveau_max_ville + 1)² + 500 * nombre_entrepôts
 * 
 * Exemples :
 * - Outpost (niveau 0) : 10 * (0+1)² = 10
 * - Colony (niveau 1) : 10 * (1+1)² = 40
 * - Town (niveau 2) : 10 * (2+1)² = 90
 * - Metropolis (niveau 3) : 10 * (3+1)² = 160
 * - Capital (niveau 4) : 10 * (4+1)² = 250
 * 
 * Chaque entrepôt (Warehouse) ajoute +500 à cette capacité.
 * 
 * @param map - La carte de jeu
 * @param civId - L'identifiant de la civilisation
 * @returns La capacité maximale d'inventaire par ressource
 */
export function calculateInventoryCapacity(
  map: GameMap,
  civId: CivilizationId
): number {
  const cities = map.getCitiesByCivilization(civId);
  
  if (cities.length === 0) {
    // Si aucune ville, capacité de base pour un outpost (niveau 0)
    return 10 * Math.pow(0 + 1, 2); // 10
  }
  
  // Trouver le niveau de ville le plus élevé
  let maxCityLevel = CityLevel.Outpost; // 0 par défaut
  for (const city of cities) {
    if (city.level > maxCityLevel) {
      maxCityLevel = city.level;
    }
  }
  
  // Compter le nombre d'entrepôts (Warehouse) dans toutes les villes
  let warehouseCount = 0;
  for (const city of cities) {
    if (city.hasBuilding(BuildingType.Warehouse)) {
      warehouseCount++;
    }
  }
  
  // Calculer la capacité : 10 * (niveau + 1)² + 500 * nb_entrepôts
  const baseCapacity = 10 * Math.pow(maxCityLevel + 1, 2);
  const warehouseBonus = 500 * warehouseCount;
  
  return baseCapacity + warehouseBonus;
}
