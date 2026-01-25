// Modèle PlayerSave
// Contient un GodState unique (pas de slots)

import { GodState } from './GodState';
import { CivilizationState } from './CivilizationState';
import { IslandState } from './IslandState';

export class PlayerSave {
  private readonly godState: GodState;

  constructor(godState: GodState) {
    this.godState = godState;
  }

  getGodState(): GodState {
    return this.godState;
  }

  serialize(): any {
    return {
      godState: this.godState.serialize()
    };
  }

  static deserialize(data: any): PlayerSave {
    if (!data || typeof data !== 'object') {
      throw new Error('Données de sauvegarde invalides: structure inattendue');
    }

    // Format nouveau: PlayerSave -> GodState -> CivilizationState -> IslandState
    if ('godState' in data) {
      const godState = GodState.deserialize((data as any).godState);
      return new PlayerSave(godState);
    }

    throw new Error('Données de sauvegarde invalides: format non reconnu');
  }
}
