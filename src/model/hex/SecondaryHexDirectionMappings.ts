import { HexDirection } from './HexDirection';
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
  [HexDirection, HexDirection]
> = {
  [SecondaryHexDirection.N]: [HexDirection.NW, HexDirection.NE],
  [SecondaryHexDirection.EN]: [HexDirection.NE, HexDirection.E],
  [SecondaryHexDirection.ES]: [HexDirection.E, HexDirection.SE],
  [SecondaryHexDirection.S]: [HexDirection.SE, HexDirection.SW],
  [SecondaryHexDirection.WS]: [HexDirection.SW, HexDirection.W],
  [SecondaryHexDirection.WN]: [HexDirection.W, HexDirection.NW],
};
