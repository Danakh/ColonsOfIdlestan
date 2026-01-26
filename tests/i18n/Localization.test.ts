import { expect, test } from 'vitest';
import { setLocale, localize, getAll } from '../../src/i18n';
import en from '../../src/i18n/en';
import fr from '../../src/i18n/fr';

test('localize reflects locale changes for en and fr', () => {
  const previous = getAll();
  try {
    setLocale(en);
    expect(localize('app.title')).toBe('Colonists of Idlestan');

    setLocale(fr);
    expect(localize('app.title')).toBe("Colons d'Idlestan");
  } finally {
    setLocale(previous);
  }
});
