export enum PrestigeBonusType {
  Production = 'Production',
  CivilizationPoint = 'CivilizationPoint',
  CostReduction = 'CostReduction',
}

export interface PrestigeBonus {
  type: PrestigeBonusType;
  value: number;
  label?: string;
}
