"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBazaarRouter = createBazaarRouter;
const express_1 = __importDefault(require("express"));
const catalog_1 = require("./catalog");
function createBazaarRouter() {
    const router = express_1.default.Router();
    // Well-known Bazaar protocol endpoint
    router.get('/.well-known/bazaar.json', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.json(await catalog_1.BazaarCatalog.getManifest());
    });
    // Capability search API
    router.get('/bazaar/search', async (req, res) => {
        const { category, maxPriceUSD, keyword } = req.query;
        const results = await catalog_1.BazaarCatalog.searchCapabilities({
            category: category,
            maxPriceUSD: maxPriceUSD ? parseFloat(maxPriceUSD) : undefined,
            keyword: keyword,
        });
        res.json({ count: results.length, capabilities: results });
    });
    return router;
}
if (require.main === module) {
    const app = (0, express_1.default)();
    const port = process.env.PORT || 4020;
    app.use('/', createBazaarRouter());
    app.listen(port, () => {
        console.log(`[Bazaar] Discovery service listening on http://localhost:${port}/.well-known/bazaar.json`);
    });
}
