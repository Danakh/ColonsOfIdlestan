import { describe, it, expect, beforeEach } from 'vitest';
import { CivilizationState } from '../../../src/model/game/CivilizationState';
import { CivilizationId } from '../../../src/model/map/CivilizationId';
import { IslandState } from '../../../src/model/game/IslandState';

describe('CivilizationState', () => {
  let civState: CivilizationState;
  const playerId = CivilizationId.create('player1');

  beforeEach(() => {
    civState = CivilizationState.createNew(playerId);
  });

  it('devrait créer une nouvelle CivilizationState avec IslandState', () => {
    expect(civState.getIslandState()).toBeDefined();
    expect(civState.getGameClock()).toBeDefined();
    expect(civState.getPlayerCivilizationId()).toEqual(playerId);
  });

  it('devrait accéder aux ressources du joueur via getPlayerResources', () => {
    const resources = civState.getPlayerResources();
    expect(resources).toBeDefined();
    expect(resources).toEqual(civState.getIslandState().getPlayerResources());
  });

  it('devrait sérialiser et désérialiser correctement', () => {
    // Sérialiser
    const serialized = civState.serialize();
    expect(serialized).toBeDefined();
    expect(typeof serialized).toBe('string');

    // Désérialiser
    const deserialized = CivilizationState.deserialize(serialized);
    expect(deserialized.getPlayerCivilizationId()).toEqual(playerId);
    expect(deserialized.getGameClock().getCurrentTime()).toEqual(civState.getGameClock().getCurrentTime());
  });

  it('devrait préserver l\'horloge de jeu lors de la sérialisation/désérialisation', () => {
    // Mettre à jour le temps
    civState.getGameClock().updateTime(123.45);

    // Sérialiser et désérialiser
    const serialized = civState.serialize();
    const deserialized = CivilizationState.deserialize(serialized);

    expect(deserialized.getGameClock().getCurrentTime()).toEqual(123.45);
  });

  it('devrait avoir GameClock accessible via getGameClock et via IslandState.getGameClock', () => {
    civState.getGameClock().updateTime(50);

    const clockFromCivState = civState.getGameClock();
    const clockFromIslandState = civState.getIslandState().getGameClock();

    expect(clockFromCivState.getCurrentTime()).toEqual(50);
    expect(clockFromIslandState.getCurrentTime()).toEqual(50);
    expect(clockFromCivState).toBe(clockFromIslandState);
  });

  it('devrait gérer les points de civilisation', () => {
    // Les points de civilisation par défaut sont 0
    expect(civState.getCivilizationPoints()).toEqual(0);

    // Définir les points
    civState.setCivilizationPoints(15);
    expect(civState.getCivilizationPoints()).toEqual(15);

    // Modifier les points
    civState.setCivilizationPoints(42);
    expect(civState.getCivilizationPoints()).toEqual(42);
  });

  it('devrait préserver les points de civilisation lors de la sérialisation/désérialisation', () => {
    civState.setCivilizationPoints(25);

    // Sérialiser
    const serialized = civState.serialize();

    // Désérialiser
    const deserialized = CivilizationState.deserialize(serialized);

    expect(deserialized.getCivilizationPoints()).toEqual(25);
  });
});
