/**
 * Horloge de jeu qui gère le temps écoulé en secondes.
 * 
 * Le temps est mis à jour par la couche applicative à chaque frame,
 * permettant une gestion du temps indépendante de la vitesse d'exécution.
 */
export class GameClock {
  private currentTime: number = 0; // Temps courant en secondes

  /**
   * Met à jour le temps courant de l'horloge.
   * Doit être appelée par la couche applicative à chaque frame.
   * 
   * @param nowSeconds - Le temps actuel en secondes (depuis un point de référence, ex: timestamp / 1000)
   */
  updateTime(nowSeconds: number): void {
    this.currentTime = nowSeconds;
  }

  /**
   * Retourne le temps courant de l'horloge en secondes.
   * @returns Le temps courant en secondes
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Réinitialise l'horloge à 0.
   * Utile pour les tests ou lors d'une nouvelle partie.
   */
  reset(): void {
    this.currentTime = 0;
  }

  /** Sérialise l'horloge en { currentTime }. */
  serialize(): { currentTime: number } {
    return { currentTime: this.currentTime };
  }

  /** Désérialise depuis { currentTime }. */
  static deserialize(data: { currentTime: number }): GameClock {
    const gc = new GameClock();
    gc.updateTime(data.currentTime);
    return gc;
  }
}
