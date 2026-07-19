export declare class PluginMarketplaceRegistrar {
    static getPluginManifest(): {
        schema_version: string;
        name_for_human: string;
        name_for_model: string;
        description_for_human: string;
        description_for_model: string;
        auth: {
            type: string;
        };
        api: {
            type: string;
            url: string;
            mcp_endpoint: string;
            has_user_authentication: boolean;
        };
        logo_url: string;
        contact_email: string;
        legal_info_url: string;
        x402_configuration: {
            enabled: boolean;
            payment_header: string;
            challenge_header: string;
            settlement_currency: string;
            merchant_address: string;
        };
        tools: {
            name: string;
            description: string;
            price: string;
        }[];
    };
    /**
     * Export the plugin entry formatted for inclusion in xai-org/plugin-marketplace repository
     */
    static exportMarketplaceEntry(targetDir: string): string;
}
