import { SellerScannerService } from './seller-scanner.service';
import { ToolGeneratorService } from './tool-generator.service';
import { DynamicToolRegistry } from '../mcp/dynamic-registry';
import { BazaarManifestManager } from '../bazaar/manifest-manager';

export class SellerEcosystemScheduler {
  private scanner: SellerScannerService;
  private generator: ToolGeneratorService;

  constructor() {
    this.scanner = new SellerScannerService();
    this.generator = new ToolGeneratorService();
  }

  /**
   * Executes a single market scan & high-ROI tool synthesis cycle.
   */
  public async executeScanAndGenerationCycle(): Promise<void> {
    console.log('========================================================================');
    console.log('  SELLER ECOSYSTEM FACTORY : 12-HOUR MARKET SCAN & TOOL GENERATOR       ');
    console.log(`  Timestamp: ${new Date().toISOString()}`);
    console.log('========================================================================\n');

    // 1. Fetch current registered tool names
    const manifest = BazaarManifestManager.getManifest();
    const existingToolNames = manifest.capabilities.map((c: any) => c.name);

    console.log(`[Market Scanner] Scanning x402 seller ecosystem demand...`);
    console.log(`[Market Scanner] Existing registered tools count: ${existingToolNames.length}`);

    // 2. Scan market for unmet high-ROI opportunities
    const scanResult = await this.scanner.scanForHighRoiOpportunities(existingToolNames);
    console.log(`[Market Scanner] Scanned ${scanResult.scannedCategoriesCount} demand categories.`);
    console.log(`[Market Scanner] Unmet high-demand opportunities found: ${scanResult.unmetDemandCount}`);

    if (!scanResult.recommendedBlueprint) {
      console.log('\n[Market Scanner] All high-ROI demand opportunities are currently fulfilled! No new service required.');
      return;
    }

    const blueprint = scanResult.recommendedBlueprint;
    console.log(`\n--- HIGH-ROI OPPORTUNITY DETECTED ---`);
    console.log(`• Tool Name: ${blueprint.toolName}`);
    console.log(`• Display Name: ${blueprint.displayName}`);
    console.log(`• Category: ${blueprint.category}`);
    console.log(`• Target Pricing: ${blueprint.priceFormatted}`);
    console.log(`• Estimated ROI Score: ${blueprint.estimatedRoiScore} / 10.0`);
    console.log(`• Description: ${blueprint.description}\n`);

    // 3. Autonomously synthesize and mount new service
    console.log(`[Code Generator] Synthesizing end-to-end TypeScript service...`);
    const generated = await this.generator.generateAndMountService(blueprint);

    console.log(`\n[SUCCESS] New Monetized Service Built & Live!`);
    console.log(`  File Path: ${generated.serviceFilePath}`);
    console.log(`  Capability ID: ${generated.capabilityId}`);
    console.log(`  Bazaar Catalog: Updated at /.well-known/bazaar.json`);
    console.log(`  MCP Endpoint: Active at /mcp/v1/call (x402 Gated: ${blueprint.priceFormatted})\n`);

    console.log('========================================================================\n');
  }

  /**
   * Starts periodic 12-hour background loop.
   */
  public start12HourDaemon(): void {
    console.log('[Seller Daemon] Starting 12-hour automated ecosystem scanning daemon...');
    
    // Initial run
    this.executeScanAndGenerationCycle().catch(console.error);

    // 12 hours in milliseconds = 12 * 60 * 60 * 1000 = 43,200,000 ms
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    setInterval(() => {
      this.executeScanAndGenerationCycle().catch(console.error);
    }, TWELVE_HOURS_MS);
  }
}

if (require.main === module) {
  const scheduler = new SellerEcosystemScheduler();
  if (process.argv.includes('--cron') || process.argv.includes('--daemon')) {
    scheduler.start12HourDaemon();
  } else {
    scheduler.executeScanAndGenerationCycle().catch(console.error);
  }
}
