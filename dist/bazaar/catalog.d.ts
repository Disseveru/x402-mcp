export interface CapabilityQuery {
    category?: string;
    maxPriceUSD?: number;
    keyword?: string;
}
export declare class BazaarCatalog {
    static getManifest(): {
        bazaarVersion: string;
        provider: {
            name: string;
            description: string;
            homepage: string;
            contact: string;
            paymentAddress: string;
            defaultTargetAgent: string;
        };
        capabilities: {
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
    };
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
