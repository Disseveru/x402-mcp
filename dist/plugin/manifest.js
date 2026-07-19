"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginMarketplaceRegistrar = void 0;
const plugin_json_1 = __importDefault(require("./plugin.json"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class PluginMarketplaceRegistrar {
    static getPluginManifest() {
        return plugin_json_1.default;
    }
    /**
     * Export the plugin entry formatted for inclusion in xai-org/plugin-marketplace repository
     */
    static exportMarketplaceEntry(targetDir) {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const pluginPath = path.join(targetDir, 'agent_commerce_suite.json');
        fs.writeFileSync(pluginPath, JSON.stringify(plugin_json_1.default, null, 2), 'utf-8');
        console.log(`[PluginRegistrar] Exported plugin manifest to ${pluginPath}`);
        return pluginPath;
    }
}
exports.PluginMarketplaceRegistrar = PluginMarketplaceRegistrar;
if (require.main === module) {
    const outputDir = path.join(__dirname, '../dist/plugin');
    PluginMarketplaceRegistrar.exportMarketplaceEntry(outputDir);
}
