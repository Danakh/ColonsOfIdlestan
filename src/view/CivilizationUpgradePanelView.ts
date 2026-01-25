/**
 * Interface pour les bonus/améliorations de civilisation.
 */
export interface CivilizationUpgrade {
  id: string;
  label: string;
  description: string;
  cost: number;
  /** Callback appelé quand l'upgrade est acheté */
  onPurchase: () => void;
}

/**
 * Callbacks pour le panneau d'amélioration de civilisation.
 */
export interface CivilizationUpgradePanelCallbacks {
  /** Callback appelé quand on ferme le panneau et relance une nouvelle partie */
  onClose?: () => void;
  /** Callback appelé quand on achète une amélioration */
  onUpgradePurchased?: (upgradeId: string, remainingPoints: number) => void;
}

export interface CivilizationUpgradePanelShowOptions {
  /** Points de prestige cumulés (affichage secondaire) */
  totalPrestigePoints?: number;
  /** Mode lecture seule pour consultation */
  readOnly?: boolean;
  /** Libellé du bouton de fermeture */
  closeLabel?: string;
  /** Sous-titre optionnel (hint) */
  subtitle?: string;
}

/**
 * Panneau pour dépenser les points de civilisation gagnés au prestige.
 * C'est l'écran principal qui remplace le jeu en attente de confirmation du prestige.
 * 
 * Le joueur peut:
 * - Voir ses points de civilisation disponibles
 * - Acheter des améliorations avec ces points
 * - Fermer le panneau pour relancer une nouvelle partie
 */
export class CivilizationUpgradePanelView {
  private panel: HTMLElement;
  private closeBtn: HTMLButtonElement | null = null;
  private pointsDisplay: HTMLElement | null = null;
  private totalPointsDisplay: HTMLElement | null = null;
  private hintDisplay: HTMLElement | null = null;
  private upgradesList: HTMLElement | null = null;
  
  private callbacks: CivilizationUpgradePanelCallbacks = {};
  private isVisible: boolean = false;
  private availablePoints: number = 0;
  private upgrades: CivilizationUpgrade[] = [];
  private totalPrestigePoints: number = 0;
  private isReadOnly: boolean = false;
  private closeLabel: string = 'Fermer et Relancer la Partie';
  private subtitle: string | null = null;

  constructor(panelId: string = 'civilization-upgrade-panel') {
    const panelEl = document.getElementById(panelId);
    const closeBtnEl = document.getElementById('civilization-upgrade-close-btn') as HTMLButtonElement;
    const pointsDisplayEl = document.getElementById('civilization-upgrade-points');
    const totalPointsDisplayEl = document.getElementById('civilization-upgrade-total');
    const hintDisplayEl = document.getElementById('civilization-upgrade-hint');
    const upgradesListEl = document.getElementById('civilization-upgrades-list');

    if (!panelEl) {
      throw new Error(`Élément avec l'id "${panelId}" introuvable`);
    }

    this.panel = panelEl;
    this.closeBtn = closeBtnEl || null;
    this.pointsDisplay = pointsDisplayEl || null;
    this.totalPointsDisplay = totalPointsDisplayEl || null;
    this.hintDisplay = hintDisplayEl || null;
    this.upgradesList = upgradesListEl || null;

    this.setupEventListeners();
  }

  /**
   * Configure les gestionnaires d'événements.
   */
  private setupEventListeners(): void {
    // Bouton Fermer
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.hide();
        if (this.callbacks.onClose) {
          this.callbacks.onClose();
        }
      });
    }

    // Touche Escape pour fermer le panneau
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        if (this.callbacks.onClose) {
          this.callbacks.onClose();
        }
      }
    });
  }

  /**
   * Définit les callbacks pour les actions du panneau.
   */
  setCallbacks(callbacks: CivilizationUpgradePanelCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Définit les améliorations disponibles.
   */
  setUpgrades(upgrades: CivilizationUpgrade[]): void {
    this.upgrades = upgrades;
  }

  /**
   * Affiche le panneau avec les points disponibles.
   * @param availablePoints Points de civilisation disponibles
   */
  show(availablePoints: number, options?: CivilizationUpgradePanelShowOptions): void {
    this.availablePoints = availablePoints;
    this.totalPrestigePoints = options?.totalPrestigePoints ?? availablePoints;
    this.isReadOnly = options?.readOnly ?? false;
    this.closeLabel = options?.closeLabel ?? 'Fermer et Relancer la Partie';
    this.subtitle = options?.subtitle ?? null;
    this.panel.classList.remove('hidden');
    this.isVisible = true;
    this.updateDisplay();
  }

  /**
   * Masque le panneau.
   */
  hide(): void {
    this.panel.classList.add('hidden');
    this.isVisible = false;
  }

  /**
   * Met à jour l'affichage du panneau.
   */
  private updateDisplay(): void {
    // Mettre à jour l'affichage des points
    if (this.pointsDisplay) {
      this.pointsDisplay.textContent = this.availablePoints.toString();
    }

    if (this.totalPointsDisplay) {
      this.totalPointsDisplay.textContent = `Prestige cumulé : ${this.totalPrestigePoints}`;
    }

    if (this.hintDisplay) {
      if (this.isReadOnly) {
        this.hintDisplay.textContent = this.subtitle ?? 'Gagnez un Prestige pour obtenir des points à dépenser.';
        this.hintDisplay.classList.remove('hidden');
      } else {
        this.hintDisplay.classList.add('hidden');
      }
    }

    if (this.closeBtn) {
      this.closeBtn.textContent = this.closeLabel;
    }

    // Mettre à jour la liste des améliorations
    if (this.upgradesList) {
      this.upgradesList.innerHTML = '';
      
      for (const upgrade of this.upgrades) {
        const li = document.createElement('li');
        li.className = 'upgrade-item';
        
        const header = document.createElement('div');
        header.className = 'upgrade-header';
        
        const titleDiv = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = upgrade.label;
        const cost = document.createElement('span');
        cost.className = 'upgrade-cost';
        cost.textContent = `${upgrade.cost} pts`;
        titleDiv.appendChild(title);
        titleDiv.appendChild(cost);
        
        const buyBtn = document.createElement('button');
        buyBtn.className = 'upgrade-buy-btn';
        buyBtn.textContent = 'Acheter';
        
        // Désactiver le bouton si le joueur n'a pas assez de points
        const canAfford = !this.isReadOnly && this.availablePoints >= upgrade.cost;
        if (!canAfford) {
          buyBtn.disabled = true;
        }
        
        buyBtn.addEventListener('click', () => {
          if (canAfford) {
            this.availablePoints -= upgrade.cost;
            upgrade.onPurchase();
            
            if (this.callbacks.onUpgradePurchased) {
              this.callbacks.onUpgradePurchased(upgrade.id, this.availablePoints);
            }
            
            this.updateDisplay();
          }
        });
        
        header.appendChild(titleDiv);
        header.appendChild(buyBtn);
        
        const description = document.createElement('p');
        description.className = 'upgrade-description';
        description.textContent = upgrade.description;
        
        li.appendChild(header);
        li.appendChild(description);
        
        this.upgradesList.appendChild(li);
      }
    }
  }

  /**
   * Retourne si le panneau est visible.
   */
  isShown(): boolean {
    return this.isVisible;
  }
}
