// Modèle PlayerSave
// Contient un GodState unique (pas de slots)

import { GodState } from './GodState';
import { CivilizationState } from './CivilizationState';
import { IslandState } from './IslandState';
import { localize } from '../../i18n';

export class PlayerSave {
  private readonly godState: GodState;
  private readonly language: string;

  constructor(godState: GodState, language = 'fr') {
    this.godState = godState;
    this.language = language;
  }

  getGodState(): GodState {
    return this.godState;
  }

  getLanguage(): string {
    return this.language;
  }

  serialize(): any {
    return {
      godState: this.godState.serialize(),
      language: this.language,
    };
  }

  static deserialize(data: any): PlayerSave {
    if (!data || typeof data !== 'object') {
      throw new Error(localize('error.save.invalidStructure'));
    }

    // Format nouveau: PlayerSave -> GodState -> CivilizationState -> IslandState
    if ('godState' in data) {
      const godState = GodState.deserialize((data as any).godState);
      const language = typeof (data as any).language === 'string' ? (data as any).language : 'fr';
      return new PlayerSave(godState, language);
    }

    throw new Error(localize('error.save.unrecognizedFormat'));
  }
}
