/**
 * Module de modèle pour les grilles hexagonales.
 * Fournit toutes les classes et types nécessaires pour représenter
 * une grille hexagonale inspirée de Catan.
 */

export { HexDirection, ALL_HEX_DIRECTIONS, inverseHexDirection } from './HexDirection';
export { SecondaryHexDirection, ALL_SECONDARY_DIRECTIONS, inverseSecondaryHexDirection } from './SecondaryHexDirection';
export { SECONDARY_TO_MAIN_DIRECTION_PAIRS } from './SecondaryHexDirectionMappings';
export { HexCoord } from './HexCoord';
export { Hex } from './Hex';
export { Edge } from './Edge';
export { Vertex } from './Vertex';
export { HexGrid } from './HexGrid';
