import pluginManifest from './plugin.json';
import * as fs from 'fs';
import * as path from 'path';

export class PluginMarketplaceRegistrar {
  public static getPluginManifest() {
    return pluginManifest;
  }

  /**
   * Export the plugin entry formatted for inclusion in xai-org/plugin-marketplace repository
   */
  public static exportMarketplaceEntry(targetDir: string) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const pluginPath = path.join(targetDir, 'agent_commerce_suite.json');
    fs.writeFileSync(pluginPath, JSON.stringify(pluginManifest, null, 2), 'utf-8');
    console.log(`[PluginRegistrar] Exported plugin manifest to ${pluginPath}`);
    return pluginPath;
  }
}

if (require.main === module) {
  const outputDir = path.join(__dirname, '../dist/plugin');
  PluginMarketplaceRegistrar.exportMarketplaceEntry(outputDir);
}
