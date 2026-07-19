export interface CapabilityQuery {
    category?: string;
    maxPriceUSD?: number;
    keyword?: string;
}
export declare class BazaarCatalog {
    static getManifest(): any;
    static searchCapabilities(query: CapabilityQuery): any;
}
