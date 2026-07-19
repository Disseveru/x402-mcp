import dotenv from 'dotenv';
dotenv.config();

export interface DeepSeekConfig {
  baseUrl: string;
  model: string;
}

export class DeepSeekAgentService {
  private baseUrl: string;
  private model: string;

  constructor(config?: Partial<DeepSeekConfig>) {
    this.baseUrl = config?.baseUrl || process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1';
    this.model = config?.model || process.env.LOCAL_LLM_MODEL || 'deepseek-r1';
  }

  /**
   * Health check to test if local DeepSeek desktop endpoint (Ollama / LM Studio) is running
   */
  public async checkHealth(): Promise<{ online: boolean; message: string }> {
    try {
      const endpoint = `${this.baseUrl.replace(/\/v1\/?$/, '')}/v1/models`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data: any = await response.json();
        return {
          online: true,
          message: `Local DeepSeek model server is ONLINE at ${this.baseUrl}. Models available: ${JSON.stringify(data.data?.map((m: any) => m.id) || [])}`,
        };
      }
      return { online: false, message: `Server responded with status ${response.status}` };
    } catch (err: any) {
      return {
        online: false,
        message: `Could not connect to local DeepSeek at ${this.baseUrl}. Ensure Ollama or LM Studio is running. Error: ${err.message}`,
      };
    }
  }

  /**
   * Ask local DeepSeek to process user goal and generate tool execution decision
   */
  public async reasonAndSelectTool(userGoal: string, availableTools: any[]): Promise<{
    toolName: string;
    arguments: Record<string, any>;
    reasoning?: string;
  }> {
    const endpoint = `${this.baseUrl.replace(/\/v1\/?$/, '')}/v1/chat/completions`;

    const systemPrompt = `You are an autonomous AI Commerce Agent powered by local DeepSeek.
Given a user goal and a list of available monetized tools, decide which tool to call and output structured JSON.

AVAILABLE TOOLS:
${JSON.stringify(availableTools, null, 2)}

Respond strictly in valid JSON format:
{
  "toolName": "name_of_tool",
  "arguments": { ... },
  "reasoning": "Brief explanation of why this tool was chosen"
}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userGoal },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek endpoint returned status ${response.status}: ${await response.text()}`);
      }

      const json: any = await response.json();
      const content = json.choices?.[0]?.message?.content || '';

      // Clean JSON fence if DeepSeek returns markdown block ```json ... ```
      const cleanedJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJsonStr);

      return {
        toolName: parsed.toolName,
        arguments: parsed.arguments || {},
        reasoning: parsed.reasoning,
      };
    } catch (err: any) {
      console.warn(`[DeepSeekAgentService] Local DeepSeek reasoning fallback: ${err.message}`);
      // Fallback rule-based matching if local LLM is still starting up
      if (userGoal.toLowerCase().includes('insight') || userGoal.toLowerCase().includes('market') || userGoal.toLowerCase().includes('btc')) {
        return {
          toolName: 'market_data_insights',
          arguments: { ticker: 'BTC', timeframe: '24h', metrics: ['volatility', 'sentiment', 'whale_flow'] },
          reasoning: 'Fallback heuristic matched market intelligence request.',
        };
      }
      return {
        toolName: 'agent_task_executor',
        arguments: { taskName: 'Local DeepSeek Task', codeOrInstructions: userGoal },
        reasoning: 'Fallback heuristic matched task execution request.',
      };
    }
  }
}
