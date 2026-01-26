/**
 * Callbacks pour le panneau de confirmation de prestige.
 */
import { localize } from '../i18n';
export interface PrestigeConfirmationCallbacks {
  /** Callback appelé lorsque l'utilisateur confirme le prestige */
  onConfirm?: () => void;
  /** Callback appelé lorsque l'utilisateur annule le prestige */
  onCancel?: () => void;
}

/**
 * Panneau de confirmation de prestige.
 * Affiche les points actuels, les points à gagner, et demande une confirmation avant d'appliquer le prestige.
 */
export class PrestigeConfirmationPanel {
  private panel: HTMLElement;
  private confirmBtn: HTMLButtonElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private currentPointsDisplay: HTMLElement | null = null;
  private gainPointsDisplay: HTMLElement | null = null;
  
  private callbacks: PrestigeConfirmationCallbacks = {};
  private isVisible: boolean = false;

  constructor(panelId: string = 'prestige-panel') {
    const panelEl = document.getElementById(panelId);
    const confirmBtnEl = document.getElementById('prestige-confirm-btn') as HTMLButtonElement;
    const cancelBtnEl = document.getElementById('prestige-cancel-btn') as HTMLButtonElement;

    if (!panelEl) {
      throw new Error(localize('error.elementNotFound', { id: panelId }));
    }

    this.panel = panelEl;
    this.confirmBtn = confirmBtnEl || null;
    this.cancelBtn = cancelBtnEl || null;
    
    this.currentPointsDisplay = document.getElementById('prestige-current-points');
    this.gainPointsDisplay = document.getElementById('prestige-gain-points');

    this.setupEventListeners();
  }

  /**
   * Configure les gestionnaires d'événements.
   */
  private setupEventListeners(): void {
    // Bouton Confirmer
    if (this.confirmBtn) {
      this.confirmBtn.addEventListener('click', () => {
        this.hide();
        if (this.callbacks.onConfirm) {
          this.callbacks.onConfirm();
        }
      });
    }

    // Bouton Annuler
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => {
        this.hide();
        if (this.callbacks.onCancel) {
          this.callbacks.onCancel();
        }
      });
    }

    // Touche Escape pour annuler le panneau
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        if (this.callbacks.onCancel) {
          this.callbacks.onCancel();
        }
      }
    });
  }

  /**
   * Définit les callbacks pour les actions du panneau.
   */
  setCallbacks(callbacks: PrestigeConfirmationCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Affiche le panneau de confirmation avec les points courants et les gains.
   * @param currentPoints Points de prestige actuels
   * @param gainPoints Points de prestige à gagner
   */
  show(currentPoints: number, gainPoints: number): void {
    this.panel.classList.remove('hidden');
    this.isVisible = true;
    this.updateDisplay(currentPoints, gainPoints);
  }

  /**
   * Masque le panneau de confirmation.
   */
  hide(): void {
    this.panel.classList.add('hidden');
    this.isVisible = false;
  }

  /**
   * Bascule la visibilité du panneau.
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    }
  }

  /**
   * Met à jour l'affichage du panneau avec les points courants et les gains.
   */
  private updateDisplay(currentPoints: number, gainPoints: number): void {
    if (this.currentPointsDisplay) {
      this.currentPointsDisplay.textContent = `${currentPoints}`;
    }
    if (this.gainPointsDisplay) {
      this.gainPointsDisplay.textContent = `+${gainPoints}`;
    }
  }

  /**
   * Vérifie si le panneau est actuellement visible.
   */
  isShown(): boolean {
    return this.isVisible;
  }
}
