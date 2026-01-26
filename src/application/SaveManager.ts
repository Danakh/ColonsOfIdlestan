import { MainGame } from './MainGame';
import { localize } from '../i18n';

export class SaveManager {
  private readonly AUTOSAVE_KEY = 'colons-of-idlestan-autosave';
  private autosaveIntervalId: number | null = null;

  constructor(private game: MainGame) {}

  saveToLocal(): void {
    try {
      const serialized = this.game.saveGame();
      localStorage.setItem(this.AUTOSAVE_KEY, serialized);
    } catch (error) {
      console.error(localize('error.autoSaveFailed'), error);
    }
  }

  loadFromLocal(): boolean {
    try {
      const saved = localStorage.getItem(this.AUTOSAVE_KEY);
      if (!saved) {
        console.log(localize('save.noneFound'));
        return false;
      }

      console.log(localize('save.loading'));
      const loaded = this.game.loadGame(saved);
      if (loaded) {
        console.log(localize('save.loaded'));
        return true;
      }

      console.warn(localize('save.corrupted.warn'));
      this.offerInvalidSaveDownload(saved, 'locale');
      localStorage.removeItem(this.AUTOSAVE_KEY);
    } catch (error) {
      console.error(localize('error.autoLoadFailed'), error);
      const saved = localStorage.getItem(this.AUTOSAVE_KEY);
      if (saved) {
        this.offerInvalidSaveDownload(saved, 'locale');
      }
      localStorage.removeItem(this.AUTOSAVE_KEY);
    }
    return false;
  }

  exportSave(): void {
    try {
      const serialized = this.game.saveGame();
      const blob = new Blob([serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `colons-of-idlestan-save-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(localize('error.exportFailed'), error);
      alert(localize('alert.exportError'));
    }
  }

  async importFromFile(file: File): Promise<{ success: boolean; content?: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const loaded = this.game.loadGame(content);
          if (!loaded) {
            this.offerInvalidSaveDownload(content, 'importée');
            resolve({ success: false, content });
            return;
          }

          // Sauvegarder immédiatement après l'import
          this.saveToLocal();
          resolve({ success: true, content });
        } catch (error) {
          console.error(localize('error.importFailed'), error);
          alert(localize('alert.importError'));
          const content = event.target?.result as string | undefined;
          if (content) {
            this.offerInvalidSaveDownload(content, 'importée');
          }
          resolve({ success: false });
        }
      };
      reader.readAsText(file);
    });
  }

  offerInvalidSaveDownload(serialized: string, context: string): void {
    try {
      const shouldDownload = window.confirm(localize('confirm.saveCorrupted', { context }));
      if (!shouldDownload) {
        return;
      }
      const blob = new Blob([serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `colons-of-idlestan-save-invalid-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error(localize('error.saveDownloadFailed'), downloadError);
    }
  }

  startAutosave(intervalMs: number): void {
    this.stopAutosave();
    this.autosaveIntervalId = window.setInterval(() => this.saveToLocal(), intervalMs);
  }

  stopAutosave(): void {
    if (this.autosaveIntervalId !== null) {
      clearInterval(this.autosaveIntervalId);
      this.autosaveIntervalId = null;
    }
  }
}

export default SaveManager;
