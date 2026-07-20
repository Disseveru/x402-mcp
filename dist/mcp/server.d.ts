export declare class AgentCommerceMCPServer {
    private server;
    private app;
    private healthMonitor;
    constructor();
    private setupMiddleware;
    private setupHandlers;
    private setupHttpEndpoints;
    startStdio(): Promise<void>;
    listenHttp(port?: number): import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
}
