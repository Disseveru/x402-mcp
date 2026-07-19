import { X402Price } from '../x402/types';
export interface AgentTaskInput {
    taskName: string;
    codeOrInstructions: string;
    maxTimeoutMs?: number;
    environmentVars?: Record<string, string>;
}
export interface AgentTaskOutput {
    taskId: string;
    status: 'COMPLETED' | 'FAILED';
    executionTimeMs: number;
    outputLogs: string[];
    resultData: any;
    resourceUsage: {
        cpuPercent: number;
        memoryMB: number;
    };
}
export declare class AgentExecutorService {
    static readonly PRICE: X402Price;
    executeTask(input: AgentTaskInput): Promise<AgentTaskOutput>;
}
