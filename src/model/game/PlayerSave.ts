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
    const godState = GodState.deserialize(data.godState);
    return new PlayerSave(godState);
  }
}
