import { MCP_TOOLS, MCPToolDefinition } from './tools';

export class DynamicToolRegistry {
  private static initialized = false;
  private static allTools: Record<string, MCPToolDefinition> = {};

  private static init() {
    if (!this.initialized) {
      this.allTools = { ...MCP_TOOLS };
      this.initialized = true;
    }
  }

  public static registerTool(tool: MCPToolDefinition) {
    this.init();
    this.allTools[tool.name] = tool;
    console.log(`[DynamicToolRegistry] Registered new monetized tool: '${tool.name}' (${tool.priceFormatted})`);
  }

  public static getTool(name: string): MCPToolDefinition | undefined {
    this.init();
    return this.allTools[name];
  }

  public static getAllTools(): MCPToolDefinition[] {
    this.init();
    return Object.values(this.allTools);
  }
}
