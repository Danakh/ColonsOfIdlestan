import { expect, test, beforeEach } from 'vitest';
import { CivilizationState } from '../../src/model/game/CivilizationState';
import { CivilizationId } from '../../src/model/map/CivilizationId';
import { CivilizationUpgradeController } from '../../src/controller/CivilizationUpgradeController';

test('purchase resource gain level deducts points and increments level', () => {
  const civId = CivilizationId.create('player1');
  const civState = CivilizationState.createNew(civId);

  // Give some civilization points
  civState.setCivilizationPoints(10);

  const islandState = civState.getIslandState();
  const civ = islandState.getCivilization(civId);

  const beforeLevel = civ.getResourceGainLevel();
  const cost = CivilizationUpgradeController.resourceGainCostForLevel(beforeLevel);

  expect(civState.getCivilizationPoints()).toBeGreaterThanOrEqual(cost);

  const ok = CivilizationUpgradeController.purchaseResourceGainLevel(civState, civId);
  expect(ok).toBe(true);
  expect(civ.getResourceGainLevel()).toBe(beforeLevel + 1);
  expect(civState.getCivilizationPoints()).toBe(10 - cost);
});

test('cannot purchase beyond max level', () => {
  const civId = CivilizationId.create('player2');
  const civState = CivilizationState.createNew(civId);
  const islandState = civState.getIslandState();
  const civ = islandState.getCivilization(civId);

  civ.setResourceGainLevel(100);
  civState.setCivilizationPoints(1000);
  const ok = CivilizationUpgradeController.purchaseResourceGainLevel(civState, civId);
  expect(ok).toBe(false);
  expect(civ.getResourceGainLevel()).toBe(100);
});
