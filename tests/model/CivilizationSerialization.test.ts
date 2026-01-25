import { expect, test } from 'vitest';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { Civilization } from '../../src/model/map/Civilization';

test('civilization serialization roundtrip preserves upgrade levels', () => {
  const civId = CivilizationId.create('player1');
  const civ = new Civilization(civId);
  civ.setResourceGainLevel(5);
  civ.setCivPointGainLevel(3);
  civ.setConstructionTimeLevel(2);

  const serialized = civ.serialize();
  const des = Civilization.deserialize(serialized);

  expect(des.getResourceGainLevel()).toBe(5);
  expect(des.getCivPointGainLevel()).toBe(3);
  expect(des.getConstructionTimeLevel()).toBe(2);
});
