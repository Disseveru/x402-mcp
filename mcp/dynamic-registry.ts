import { MCP_TOOLS, MCPToolDefinition } from './tools';

export class DynamicToolRegistry {
  private static dynamicTools: Record<string, MCPToolDefinition> = {};

  public static registerTool(tool: MCPToolDefinition) {
    this.dynamicTools[tool.name] = tool;
    // Mutate global MCP_TOOLS map for instant server pick-up
    MCP_TOOLS[tool.name] = tool;
    console.log(`[DynamicToolRegistry] Registered new monetized tool: '${tool.name}' (${tool.priceFormatted})`);
  }

  public static getTool(name: string): MCPToolDefinition | undefined {
    return MCP_TOOLS[name] || this.dynamicTools[name];
  }

  public static getAllTools(): MCPToolDefinition[] {
    return Object.values(MCP_TOOLS);
  }
}
