"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BazaarCatalog = void 0;
const manifest_manager_1 = require("./manifest-manager");
class BazaarCatalog {
    static async getManifest() {
        const rawManifest = await manifest_manager_1.BazaarManifestManager.getManifest();
        const cloned = JSON.parse(JSON.stringify(rawManifest));
        if (process.env.MERCHANT_PAYMENT_ADDRESS) {
            if (!cloned.provider)
                cloned.provider = {};
            cloned.provider.paymentAddress = process.env.MERCHANT_PAYMENT_ADDRESS;
        }
        return cloned;
    }
    static async searchCapabilities(query) {
        const activeManifest = await this.getManifest();
        if (!activeManifest.capabilities)
            return [];
        return activeManifest.capabilities.filter((cap) => {
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
exports.BazaarCatalog = BazaarCatalog;
