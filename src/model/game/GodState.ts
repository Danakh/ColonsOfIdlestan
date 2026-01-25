// Modèle GodState
// Contient GodPoints et CivilizationState

import { CivilizationState } from './CivilizationState';

export class GodState {
  private readonly godPoints: number;
  private readonly civilizationState: CivilizationState;

  constructor(godPoints: number, civilizationState: CivilizationState) {
    this.godPoints = godPoints;
    this.civilizationState = civilizationState;
  }

  getGodPoints(): number {
    return this.godPoints;
  }

  getCivilizationState(): CivilizationState {
    return this.civilizationState;
  }

  serialize(): any {
    return {
      godPoints: this.godPoints,
      civilizationState: this.civilizationState.serialize()
    };
  }

  static deserialize(data: any): GodState {
    const godPoints = typeof data.godPoints === 'number' ? data.godPoints : 0;
    const civilizationState = CivilizationState.deserialize(data.civilizationState);
    return new GodState(godPoints, civilizationState);
  }
}
