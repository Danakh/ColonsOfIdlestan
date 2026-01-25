import { ResourceSprites } from './ResourceSprites';
import { InventoryView } from './InventoryView';

export class ResourceLoader {
  private resourceSprites: ResourceSprites;
  private inventoryView: InventoryView;

  constructor(resourceListElementId: string) {
    this.resourceSprites = new ResourceSprites();
    this.inventoryView = new InventoryView(resourceListElementId, this.resourceSprites);
  }

  getResourceSprites(): ResourceSprites {
    return this.resourceSprites;
  }

  getInventoryView(): InventoryView {
    return this.inventoryView;
  }

  onAllLoaded(cb: () => void): void {
    this.resourceSprites.onAllLoaded(cb);
  }

  load(): void {
    this.resourceSprites.load();
  }
}

export default ResourceLoader;
