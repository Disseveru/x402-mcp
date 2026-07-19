export interface CapabilityQuery {
    category?: string;
    maxPriceUSD?: number;
    keyword?: string;
}
export declare class BazaarCatalog {
    static getManifest(): {
        provider: {
            paymentAddress: string;
            name: string;
            description: string;
            homepage: string;
            contact: string;
            defaultTargetAgent: string;
        };
        bazaarVersion: string;
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
