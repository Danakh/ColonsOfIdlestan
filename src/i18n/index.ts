import fr from './fr';

let locale: Record<string, string> = fr;

export function setLocale(l: Record<string, string>) {
  locale = l;
}

export function getAll(): Record<string, string> {
  return locale;
}

export function localize(key: string, params?: Record<string, string | number>): string {
  let s = locale[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace(`{${k}}`, String(params[k]));
    }
  }
  return s;
}

export default { t: localize, setLocale, getAll };
