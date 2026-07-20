import express from 'express';
import { BazaarCatalog } from './catalog';

export function createBazaarRouter() {
  const router = express.Router();

  // Well-known Bazaar protocol endpoint
  router.get('/.well-known/bazaar.json', async (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(await BazaarCatalog.getManifest());
  });

  // Capability search API
  router.get('/bazaar/search', async (req, res) => {
    const { category, maxPriceUSD, keyword } = req.query;
    const results = await BazaarCatalog.searchCapabilities({
      category: category as string,
      maxPriceUSD: maxPriceUSD ? parseFloat(maxPriceUSD as string) : undefined,
      keyword: keyword as string,
    });
    res.json({ count: results.length, capabilities: results });
  });

  return router;
}

if (require.main === module) {
  const app = express();
  const port = process.env.PORT || 4020;
  app.use('/', createBazaarRouter());
  app.listen(port, () => {
    console.log(`[Bazaar] Discovery service listening on http://localhost:${port}/.well-known/bazaar.json`);
  });
}
