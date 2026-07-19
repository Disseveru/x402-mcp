"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BazaarCatalog = void 0;
const manifest_json_1 = __importDefault(require("./manifest.json"));
class BazaarCatalog {
    static getManifest() {
        const cloned = JSON.parse(JSON.stringify(manifest_json_1.default));
        if (process.env.MERCHANT_PAYMENT_ADDRESS) {
            cloned.provider.paymentAddress = process.env.MERCHANT_PAYMENT_ADDRESS;
        }
        return cloned;
    }
    static searchCapabilities(query) {
        const activeManifest = this.getManifest();
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
