import { BuildingType } from '../model/city/BuildingType';
import { City } from '../model/city/City';
import { Civilization } from '../model/map/Civilization';
import { Building } from '../model/city/Building';
import { IslandMap } from '../model/map/IslandMap';
import { t } from '../i18n';

/**
 * Callbacks pour les actions du panneau d'automatisation.
 */
export interface AutomationPanelCallbacks {
  /** Callback appelé lorsqu'une automatisation est activée/désactivée */
  onToggleAutomation?: (automationType: AutomationType, enabled: boolean) => void;
  /** Callback appelé lorsque l'utilisateur ferme le panneau */
  onClose?: () => void;
  /** Callback appelé lorsque le bouton d'automatisation est cliqué */
  onOpenAutomation?: () => void;
}

/**
 * Types d'automatisations disponibles.
 */
export enum AutomationType {
  /** Construction automatique de routes (niveau 1) */
  RoadConstruction = 'RoadConstruction',
  /** Construction automatique d'outposts et amélioration automatique de villes (niveau 2) */
  OutpostConstruction = 'OutpostConstruction',
  /** Amélioration automatique de villes (niveau 2) */
  CityUpgrade = 'CityUpgrade',
  /** Construction automatique de bâtiments de production (niveau 3) */
  ProductionBuildingConstruction = 'ProductionBuildingConstruction',
}

/**
 * Noms des automatisations en français.
 */
const AUTOMATION_NAMES: Record<AutomationType, string> = {
  [AutomationType.RoadConstruction]: t('automation.name.road'),
  [AutomationType.OutpostConstruction]: t('automation.name.outpost'),
  [AutomationType.CityUpgrade]: t('automation.name.cityUpgrade'),
  [AutomationType.ProductionBuildingConstruction]: t('automation.name.production'),
};

/**
 * Interface pour les dépendances nécessaires à la configuration des callbacks.
 */
export interface AutomationPanelDependencies {
  /** Fonction pour obtenir le sommet sélectionné */
  getSelectedVertex: () => import('../model/hex/Vertex').Vertex | null;
  /** Fonction pour obtenir la carte de jeu */
  getIslandMap: () => IslandMap | null;
  /** Fonction pour obtenir l'ID de la civilisation du joueur */
  getPlayerCivilizationId: () => import('../model/map/CivilizationId').CivilizationId;
  /** Fonction pour obtenir la civilisation depuis le IslandState */
  getCivilization: (civId: import('../model/map/CivilizationId').CivilizationId) => Civilization;
  /** Fonction pour mettre à jour l'affichage des ressources */
  updateResourcesDisplay: () => void;
  /** Fonction pour rafraîchir le panneau de ville */
  refreshCityPanel: () => void;
  /** Fonction pour obtenir la ville actuelle depuis le panneau de ville */
  getCurrentCity: () => City | null;
  /** Fonction pour rendre la carte */
  renderMap: (islandMap: IslandMap, civId: import('../model/map/CivilizationId').CivilizationId) => void;
  /** Fonction pour sauvegarder automatiquement */
  autoSave: () => void;
}

/**
 * Vue pour le panneau d'automatisation de la Guilde des batisseurs.
 * Permet d'activer/désactiver les automatisations selon le niveau de la Guilde.
 * Gère également le bouton d'automatisation dans le footer du panneau de ville.
 */
export class AutomationPanelView {
  private panel: HTMLElement;
  private automationList: HTMLUListElement;
  private closeBtn: HTMLButtonElement;
  private automationBtn: HTMLButtonElement | null = null;
  
  private callbacks: AutomationPanelCallbacks = {};
  private enabledAutomations: Set<AutomationType> = new Set();
  private buildersGuild: Building | null = null;
  private currentCity: City | null = null;
  private currentCivilization: Civilization | null = null;

  constructor(panelId: string = 'automation-panel', automationBtnId: string = 'city-automation-btn') {
    const panelEl = document.getElementById(panelId);
    const automationListEl = document.getElementById('automation-list') as HTMLUListElement;
    const closeBtnEl = document.getElementById('automation-close-btn') as HTMLButtonElement;
    const automationBtnEl = document.getElementById(automationBtnId) as HTMLButtonElement;

    if (!panelEl) {
      throw new Error(t('error.elementNotFound', { id: panelId }));
    }
    if (!automationListEl) {
      throw new Error(t('error.elementNotFound', { id: 'automation-list' }));
    }
    if (!closeBtnEl) {
      throw new Error(t('error.elementNotFound', { id: 'automation-close-btn' }));
    }

    this.panel = panelEl;
    this.automationList = automationListEl;
    this.closeBtn = closeBtnEl;
    this.automationBtn = automationBtnEl ?? null;

    // Configurer les gestionnaires d'événements
    this.setupEventListeners();
  }

  /**
   * Définit les callbacks pour les actions du panneau.
   */
  setCallbacks(callbacks: AutomationPanelCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Configure les callbacks du panneau d'automatisation avec les dépendances nécessaires.
   * @param dependencies - Les dépendances nécessaires pour configurer les callbacks
   */
  configureCallbacks(dependencies: AutomationPanelDependencies): void {
    this.setCallbacks({
      onOpenAutomation: () => {
        const selectedVertex = dependencies.getSelectedVertex();
        const currentIslandMap = dependencies.getIslandMap();
        if (!selectedVertex || !currentIslandMap || !currentIslandMap.hasCity(selectedVertex)) {
          return;
        }
        const city = currentIslandMap.getCity(selectedVertex);
        if (!city) {
          return;
        }
        const civId = dependencies.getPlayerCivilizationId();
        const civilization = dependencies.getCivilization(civId);
        this.show(city, civilization);
      },
      onToggleAutomation: (automationType: AutomationType, enabled: boolean) => {
        const selectedVertex = dependencies.getSelectedVertex();
        const currentIslandMap = dependencies.getIslandMap();
        if (!selectedVertex || !currentIslandMap || !currentIslandMap.hasCity(selectedVertex)) {
          return;
        }
        const city = currentIslandMap.getCity(selectedVertex);
        if (!city) {
          return;
        }

        try {
          const buildersGuild = city.getBuilding(BuildingType.BuildersGuild);
          if (!buildersGuild) {
            return;
          }

          const civId = dependencies.getPlayerCivilizationId();
          const civilization = dependencies.getCivilization(civId);

          // Vérifier que l'automatisation peut être activée selon le niveau de la Guilde
          let canEnable = false;
          switch (automationType) {
            case AutomationType.RoadConstruction:
              canEnable = buildersGuild.canEnableAutoRoadConstruction();
              if (canEnable) {
                civilization.setAutoRoadConstruction(enabled);
              }
              break;
            case AutomationType.OutpostConstruction:
              canEnable = buildersGuild.canEnableAutoOutpostConstruction();
              if (canEnable) {
                civilization.setAutoOutpostConstruction(enabled);
              }
              break;
            case AutomationType.CityUpgrade:
              canEnable = buildersGuild.canEnableAutoCityUpgrade();
              if (canEnable) {
                civilization.setAutoCityUpgrade(enabled);
              }
              break;
            case AutomationType.ProductionBuildingConstruction:
              canEnable = buildersGuild.canEnableAutoProductionBuildingConstruction();
              if (canEnable) {
                civilization.setAutoProductionBuildingConstruction(enabled);
              }
              break;
          }

          if (!canEnable) {
            return; // L'automatisation ne peut pas être activée à ce niveau
          }

          // Mettre à jour l'affichage
          dependencies.updateResourcesDisplay();
          dependencies.refreshCityPanel();
          const currentCity = dependencies.getCurrentCity();
          this.updateAutomationButton(currentCity);

          // Re-rendre la carte
          dependencies.renderMap(currentIslandMap, civId);

          // Sauvegarder le jeu
          dependencies.autoSave();
        } catch (error) {
          console.error(t('error.automationModifyFailed'), error);
          alert(t('error.automationModifyFailedDetail', { detail: error instanceof Error ? error.message : String(error) }));
        }
      },
      onClose: () => {
        this.hide();
      },
    });
  }

  /**
   * Configure les gestionnaires d'événements.
   */
  private setupEventListeners(): void {
    // Bouton Fermer
    this.closeBtn.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onClose) {
        this.callbacks.onClose();
      }
    });

    // Bouton Automatisation (footer du panneau de ville)
    if (this.automationBtn) {
      this.automationBtn.addEventListener('click', () => {
        if (this.automationBtn?.disabled) {
          return;
        }
        if (this.callbacks.onOpenAutomation) {
          this.callbacks.onOpenAutomation();
        }
      });
    }

    // Touche Escape pour fermer le panneau
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.panel.classList.contains('hidden')) {
        this.hide();
        if (this.callbacks.onClose) {
          this.callbacks.onClose();
        }
      }
    });
  }

  /**
   * Affiche le panneau d'automatisation et initialise la liste.
   * @param city - La ville avec la Guilde des batisseurs
   * @param civilization - La civilisation contenant les flags d'automatisation
   */
  show(city: City, civilization: Civilization): void {
    const buildersGuild = city.getBuilding(BuildingType.BuildersGuild);
    if (!buildersGuild) {
      throw new Error('La ville doit avoir une Guilde des batisseurs pour ouvrir le panneau d\'automatisation.');
    }

    this.currentCity = city;
    this.currentCivilization = civilization;
    this.buildersGuild = buildersGuild;
    
    // Initialiser les automatisations activées depuis la civilisation
    this.enabledAutomations.clear();
    if (civilization.isAutoRoadConstructionEnabled()) {
      this.enabledAutomations.add(AutomationType.RoadConstruction);
    }
    if (civilization.isAutoOutpostConstructionEnabled()) {
      this.enabledAutomations.add(AutomationType.OutpostConstruction);
    }
    if (civilization.isAutoCityUpgradeEnabled()) {
      this.enabledAutomations.add(AutomationType.CityUpgrade);
    }
    if (civilization.isAutoProductionBuildingConstructionEnabled()) {
      this.enabledAutomations.add(AutomationType.ProductionBuildingConstruction);
    }

    this.update();
    this.panel.classList.remove('hidden');
  }

  /**
   * Met à jour le bouton d'automatisation dans le footer du panneau de ville.
   * @param city - La ville sélectionnée, ou null si aucune
   */
  updateAutomationButton(city: City | null): void {
    if (!this.automationBtn) {
      return;
    }

    const hasBuildersGuild = Boolean(city && city.hasBuilding(BuildingType.BuildersGuild));

    // Le bouton doit être caché tant que la Guilde des batisseurs n'est pas construite
    this.automationBtn.hidden = !hasBuildersGuild;
    this.automationBtn.disabled = !hasBuildersGuild;
    if (hasBuildersGuild) {
      this.automationBtn.textContent = 'Automatisation';
      this.automationBtn.title = 'Ouvrir le panneau d\'automatisation.';
    }
  }

  /**
   * Cache le panneau d'automatisation.
   */
  hide(): void {
    this.panel.classList.add('hidden');
  }

  /**
   * Met à jour l'affichage de la liste des automatisations.
   */
  private update(): void {
    this.updateAutomationList();
  }

  /**
   * Met à jour la liste des automatisations.
   */
  private updateAutomationList(): void {
    this.automationList.innerHTML = '';

    // Ordre d'affichage des automatisations selon le niveau
    const automationOrder: AutomationType[] = [
      AutomationType.RoadConstruction,
      AutomationType.OutpostConstruction,
      AutomationType.CityUpgrade,
      AutomationType.ProductionBuildingConstruction,
    ];

    if (!this.buildersGuild) {
      return;
    }

    for (const automationType of automationOrder) {
      // Vérifier si l'automatisation est disponible selon le niveau
      const isAvailable = this.isAutomationAvailable(automationType, this.buildersGuild);
      if (!isAvailable) {
        continue; // Ne pas afficher les automatisations non disponibles
      }

      const isEnabled = this.enabledAutomations.has(automationType);
      
      const item = document.createElement('li');
      item.className = 'automation-item';
      
      // Case à cocher
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `automation-${automationType}`;
      checkbox.checked = isEnabled;
      checkbox.className = 'automation-checkbox';
      
      // Label pour la case à cocher
      const label = document.createElement('label');
      label.htmlFor = `automation-${automationType}`;
      label.className = 'automation-label';
      label.textContent = AUTOMATION_NAMES[automationType];
      
      // Gestionnaire de changement pour la case à cocher
      checkbox.addEventListener('change', () => {
        const newEnabled = checkbox.checked;
        this.enabledAutomations = new Set(this.enabledAutomations);
        if (newEnabled) {
          this.enabledAutomations.add(automationType);
        } else {
          this.enabledAutomations.delete(automationType);
        }
        if (this.callbacks.onToggleAutomation) {
          this.callbacks.onToggleAutomation(automationType, newEnabled);
        }
      });

      item.appendChild(checkbox);
      item.appendChild(label);
      this.automationList.appendChild(item);
    }
  }

  /**
   * Vérifie si une automatisation est disponible selon le niveau de la Guilde des batisseurs.
   * @param automationType - Le type d'automatisation
   * @param buildersGuild - Le bâtiment Guilde des batisseurs
   * @returns true si l'automatisation est disponible
   */
  private isAutomationAvailable(automationType: AutomationType, buildersGuild: Building): boolean {
    switch (automationType) {
      case AutomationType.RoadConstruction:
        return buildersGuild.canEnableAutoRoadConstruction();
      case AutomationType.OutpostConstruction:
        return buildersGuild.canEnableAutoOutpostConstruction();
      case AutomationType.CityUpgrade:
        return buildersGuild.canEnableAutoCityUpgrade();
      case AutomationType.ProductionBuildingConstruction:
        return buildersGuild.canEnableAutoProductionBuildingConstruction();
      default:
        return false;
    }
  }
}
