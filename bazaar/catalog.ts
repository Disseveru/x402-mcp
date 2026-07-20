import { BazaarManifestManager } from './manifest-manager';

export interface CapabilityQuery {
  category?: string;
  maxPriceUSD?: number;
  keyword?: string;
}

export class BazaarCatalog {
  public static async getManifest() {
    const rawManifest = await BazaarManifestManager.getManifest();
    const cloned = JSON.parse(JSON.stringify(rawManifest));
    if (process.env.MERCHANT_PAYMENT_ADDRESS) {
      if (!cloned.provider) cloned.provider = {};
      cloned.provider.paymentAddress = process.env.MERCHANT_PAYMENT_ADDRESS;
    }
    return cloned;
  }

  public static async searchCapabilities(query: CapabilityQuery) {
    const activeManifest = await this.getManifest();
    if (!activeManifest.capabilities) return [];
    
    return activeManifest.capabilities.filter((cap: any) => {
      if (query.category && cap.category !== query.category) {
        return false;
      }
      if (query.maxPriceUSD !== undefined) {
        const priceUSD = cap.price.amount / 100;
        if (priceUSD > query.maxPriceUSD) {
          return false;
        }
      }
      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        const matchesName = cap.name.toLowerCase().includes(kw);
        const matchesDesc = cap.description.toLowerCase().includes(kw);
        if (!matchesName && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }
}
