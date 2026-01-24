import { MainHexDirection } from './MainHexDirection';
import { SecondaryHexDirection } from './SecondaryHexDirection';

/**
 * Mapping centralisé entre directions secondaires et paires de directions principales.
 * 
 * Chaque direction secondaire correspond à un sommet (vertex) qui se situe entre
 * deux directions principales adjacentes dans le sens horaire.
 * 
 * Exemple : SecondaryHexDirection.N se situe entre MainHexDirection.NW et MainHexDirection.NE
 */
export const SECONDARY_TO_MAIN_DIRECTION_PAIRS: Record<
  SecondaryHexDirection,
  [MainHexDirection, MainHexDirection]
> = {
  [SecondaryHexDirection.N]: [MainHexDirection.NW, MainHexDirection.NE],
  [SecondaryHexDirection.EN]: [MainHexDirection.NE, MainHexDirection.E],
  [SecondaryHexDirection.ES]: [MainHexDirection.E, MainHexDirection.SE],
  [SecondaryHexDirection.S]: [MainHexDirection.SE, MainHexDirection.SW],
  [SecondaryHexDirection.WS]: [MainHexDirection.SW, MainHexDirection.W],
  [SecondaryHexDirection.WN]: [MainHexDirection.W, MainHexDirection.NW],
};
