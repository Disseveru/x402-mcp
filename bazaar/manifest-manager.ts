import * as fs from 'fs';
import * as path from 'path';

export interface BazaarCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  paymentRequired: boolean;
  price: {
    amount: number;
    currency: string;
    formatted: string;
  };
  mcpTool: string;
  endpoint: string;
}

export class BazaarManifestManager {
  private static manifestPath = path.join(__dirname, 'manifest.json');

  public static getManifest(): any {
    const raw = fs.readFileSync(this.manifestPath, 'utf-8');
    return JSON.parse(raw);
  }

  public static registerCapability(newCapability: BazaarCapability): boolean {
    const manifest = this.getManifest();
    const existingIndex = manifest.capabilities.findIndex(
      (c: BazaarCapability) => c.name === newCapability.name || c.id === newCapability.id
    );

    if (existingIndex >= 0) {
      manifest.capabilities[existingIndex] = newCapability;
    } else {
      manifest.capabilities.push(newCapability);
    }

    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    return true;
  }
}
