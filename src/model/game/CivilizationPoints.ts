import { IslandMap } from '../map/IslandMap';
import { CivilizationId } from '../map/CivilizationId';
import { BuildingType } from '../city/BuildingType';

/**
 * Calcule les points de civilisation pour une civilisation.
 * 
 * Points de civilisation :
 * - Chaque ville rapporte 1 point par niveau (Outpost = 0, Colony = 1, Town = 2, Metropolis = 3, Capital = 4)
 * - Chaque bibliothèque (Library) rapporte 1 point supplémentaire
 * 
 * @param map - La carte de jeu
 * @param civId - L'identifiant de la civilisation
 * @returns Le nombre total de points de civilisation
 */
export function calculateCivilizationPoints(
  map: IslandMap,
  civId: CivilizationId
): number {
  const cities = map.getCitiesByCivilization(civId);
  let points = 0;

  for (const city of cities) {
    // Points basés sur le niveau de la ville (1 point par niveau)
    points += city.level;

    // Points pour les bibliothèques (1 point par bibliothèque)
    if (city.hasBuilding(BuildingType.Library)) {
      points += 1;
    }

    // Points pour les temples (1 point par temple)
    if (city.hasBuilding(BuildingType.Temple)) {
      points += 1;
    }
  }

  return points;
}

/**
 * Vérifie si une civilisation a au moins une bibliothèque construite.
 * 
 * @param map - La carte de jeu
 * @param civId - L'identifiant de la civilisation
 * @returns true si la civilisation a au moins une bibliothèque
 */
export function hasLibrary(map: IslandMap, civId: CivilizationId): boolean {
  const cities = map.getCitiesByCivilization(civId);
  
  for (const city of cities) {
    if (city.hasBuilding(BuildingType.Library)) {
      return true;
    }
  }
  
  return false;
}
