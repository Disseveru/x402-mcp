export interface CapabilityQuery {
    category?: string;
    maxPriceUSD?: number;
    keyword?: string;
}
export declare class BazaarCatalog {
    static getManifest(): any;
    static searchCapabilities(query: CapabilityQuery): {
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
    }[];
}
