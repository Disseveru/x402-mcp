import manifest from './manifest.json';

export interface CapabilityQuery {
  category?: string;
  maxPriceUSD?: number;
  keyword?: string;
}

export class BazaarCatalog {
  public static getManifest() {
    return manifest;
  }

  public static searchCapabilities(query: CapabilityQuery) {
    return manifest.capabilities.filter(cap => {
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
