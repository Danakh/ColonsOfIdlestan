/**
 * Niveaux de ville disponibles dans le jeu.
 * 
 * Les villes progressent du niveau 0 (avant-poste) au niveau 4 (capitale).
 * Une seule capitale est autorisée par île.
 */
export enum CityLevel {
  /** Avant-poste - Niveau 0 (ville initiale) */
  Outpost = 0,
  /** Colonie - Niveau 1 */
  Colony = 1,
  /** Ville - Niveau 2 */
  Town = 2,
  /** Métropole - Niveau 3 */
  Metropolis = 3,
  /** Capitale - Niveau 4 (une seule par île) */
  Capital = 4,
}

/**
 * Noms des niveaux de ville en français.
 */
import { t } from '../../i18n';

export const CITY_LEVEL_NAMES: Record<CityLevel, string> = {
  [CityLevel.Outpost]: t('cityLevel.outpost'),
  [CityLevel.Colony]: t('cityLevel.colony'),
  [CityLevel.Town]: t('cityLevel.town'),
  [CityLevel.Metropolis]: t('cityLevel.metropolis'),
  [CityLevel.Capital]: t('cityLevel.capital'),
};

/**
 * Retourne le nom d'un niveau de ville en français.
 * @param level - Le niveau de ville
 * @returns Le nom en français
 */
export function getCityLevelName(level: CityLevel): string {
  return CITY_LEVEL_NAMES[level];
}

/**
 * Retourne le niveau de ville suivant, ou undefined si c'est le niveau maximum.
 * @param level - Le niveau actuel
 * @returns Le niveau suivant, ou undefined si déjà au maximum
 */
export function getNextCityLevel(level: CityLevel): CityLevel | undefined {
  if (level === CityLevel.Capital) {
    return undefined;
  }
  return level + 1;
}

/**
 * Vérifie si un niveau de ville est valide.
 * @param level - Le niveau à vérifier
 * @returns true si le niveau est valide (0-4)
 */
export function isValidCityLevel(level: number): level is CityLevel {
  return level >= CityLevel.Outpost && level <= CityLevel.Capital;
}
