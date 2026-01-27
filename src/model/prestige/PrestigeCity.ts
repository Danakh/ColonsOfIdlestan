import { Vertex } from '../hex/Vertex';
import { CityLevel } from '../city/CityLevel';
import { PrestigeBonus } from './types';

export interface PrestigeCitySerialized {
  vertex: [number, number][];
  level: CityLevel;
  bonus?: PrestigeBonus;
}

export class PrestigeCity {
  constructor(
    public readonly vertex: Vertex,
    private lvl: CityLevel = CityLevel.Outpost,
    public readonly bonus?: PrestigeBonus
  ) {}

  get level(): CityLevel {
    return this.lvl;
  }

  upgrade(): void {
    if (this.lvl === CityLevel.Capital) return;
    this.lvl = (this.lvl + 1) as CityLevel;
  }

  serialize(): PrestigeCitySerialized {
    return {
      vertex: this.vertex.serialize(),
      level: this.lvl,
      bonus: this.bonus,
    };
  }

  static deserialize(data: PrestigeCitySerialized): PrestigeCity {
    const v = Vertex.deserialize(data.vertex);
    return new PrestigeCity(v, data.level, data.bonus);
  }
}
