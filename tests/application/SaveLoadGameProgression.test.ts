import { describe, it, expect } from 'vitest';
import { Make7HexesMapWithPortCity, Make7HexesMapWithPortAndCapital } from '../utils/GameProgressionTest';
import { CivilizationState } from '../../src/model/game/CivilizationState';
import { GodState } from '../../src/model/game/GodState';
import { PlayerSave } from '../../src/model/game/PlayerSave';

/**
 * Tests de sauvegarde/chargement et comparaison avec l'état avant sauvegarde
 * pour les scénarios définis dans GameProgressionTest.
 */
describe('Sauvegarde/Chargement - GameProgressionTest', () => {
  it('Port City niveau 3: round-trip PlayerSave conserve IslandState identique', () => {
    // Générer le scénario (écrit aussi un fichier de sauvegarde via saveIslandState)
    const originalState = Make7HexesMapWithPortCity();

    // Construire une PlayerSave autour de l'IslandState courant
    const civState = new CivilizationState(originalState, originalState.getGameClock());
    const godState = new GodState(0, civState);
    const playerSave = new PlayerSave(godState);

    // Sauvegarder (sérialiser PlayerSave)
    const serialized = JSON.stringify(playerSave.serialize());

    // Charger (désérialiser PlayerSave) puis récupérer l'IslandState
    const loaded = PlayerSave.deserialize(JSON.parse(serialized));
    const loadedIslandState = loaded.getGodState().getCivilizationState().getIslandState();

    // Comparer les sérialisations IslandState avant/après
    const beforeJson = originalState.serialize();
    const afterJson = loadedIslandState.serialize();
    expect(afterJson).toEqual(beforeJson);
  });

  it('Port + Capital: round-trip PlayerSave conserve IslandState identique', () => {
    // Générer le scénario (écrit aussi un fichier de sauvegarde via saveIslandState)
    const originalState = Make7HexesMapWithPortAndCapital();

    // Construire une PlayerSave autour de l'IslandState courant
    const civState = new CivilizationState(originalState, originalState.getGameClock());
    const godState = new GodState(0, civState);
    const playerSave = new PlayerSave(godState);

    // Sauvegarder (sérialiser PlayerSave)
    const serialized = JSON.stringify(playerSave.serialize());

    // Charger (désérialiser PlayerSave) puis récupérer l'IslandState
    const loaded = PlayerSave.deserialize(JSON.parse(serialized));
    const loadedIslandState = loaded.getGodState().getCivilizationState().getIslandState();

    // Comparer les sérialisations IslandState avant/après
    const beforeJson = originalState.serialize();
    const afterJson = loadedIslandState.serialize();
    expect(afterJson).toEqual(beforeJson);
  });
});