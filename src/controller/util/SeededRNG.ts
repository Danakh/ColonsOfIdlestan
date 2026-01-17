/**
 * Générateur de nombres aléatoires seedé simple.
 * 
 * Implémentation d'un Linear Congruential Generator (LCG)
 * pour une génération aléatoire déterministe et reproductible.
 * 
 * Formule: next = (a * current + c) mod m
 * Paramètres: a = 1664525, c = 1013904223, m = 2^32
 */
export class SeededRNG {
  private state: number;

  /**
   * Crée un nouveau générateur avec une seed initiale.
   * @param seed - La seed initiale
   */
  constructor(seed: number) {
    // Convertir en entier non signé 32 bits
    this.state = seed >>> 0;
  }

  /**
   * Génère le prochain nombre aléatoire entre 0 (inclus) et 1 (exclus).
   * @returns Un nombre aléatoire entre 0 et 1
   */
  next(): number {
    // LCG: (a * state + c) mod m
    // Paramètres de Borland C/C++ (utilisés pour leur simplicité et qualité)
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    // Normaliser à [0, 1)
    return (this.state >>> 0) / 0x100000000;
  }

  /**
   * Génère un nombre entier aléatoire entre min (inclus) et max (exclus).
   * @param min - Borne inférieure (inclus)
   * @param max - Borne supérieure (exclus)
   * @returns Un entier aléatoire dans l'intervalle [min, max)
   */
  nextInt(min: number, max: number): number {
    if (min >= max) {
      throw new Error(`min (${min}) doit être strictement inférieur à max (${max})`);
    }
    const range = max - min;
    return min + Math.floor(this.next() * range);
  }

  /**
   * Sélectionne un élément aléatoire dans un tableau.
   * @param array - Le tableau source
   * @returns Un élément du tableau, ou undefined si le tableau est vide
   */
  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) {
      return undefined;
    }
    const index = this.nextInt(0, array.length);
    return array[index];
  }

  /**
   * Mélange un tableau de manière aléatoire (algorithme de Fisher-Yates).
   * Modifie le tableau en place.
   * @param array - Le tableau à mélanger
   */
  shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Retourne l'état actuel du générateur (utile pour les tests).
   */
  getState(): number {
    return this.state;
  }
}
