export declare class AgentCommerceMCPServer {
    private server;
    private app;
    constructor();
    private setupHandlers;
    private setupHttpEndpoints;
    initialize(): Promise<void>;
    startStdio(): Promise<void>;
    listenHttp(port?: number): Promise<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>>;
}
