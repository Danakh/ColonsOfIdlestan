// Modèle PlayerSave
// Contient un GodState unique (pas de slots)

import { GodState } from './GodState';

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
    if (!('godState' in data)) {
      throw new Error('Données de sauvegarde invalides: champ godState manquant');
    }

    const godState = GodState.deserialize((data as any).godState);
    return new PlayerSave(godState);
  }
}
