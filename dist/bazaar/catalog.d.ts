export interface CapabilityQuery {
    category?: string;
    maxPriceUSD?: number;
    keyword?: string;
}
export declare class BazaarCatalog {
    static getManifest(): Promise<any>;
    static searchCapabilities(query: CapabilityQuery): Promise<any>;
}
