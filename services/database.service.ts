import { Pool, Client } from 'pg';

export class DatabaseService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.warn('[Database] DATABASE_URL not set. Database service will not be available.');
      this.pool = new Pool();
      return;
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('[Database] Unexpected error on idle client', err);
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      console.log('[Database] Connected to PostgreSQL');
    } catch (err) {
      console.error('[Database] Connection failed:', err);
      throw err;
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch (err) {
      console.error('[Database] Query error:', err);
      throw err;
    }
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  async execute(sql: string, params: any[] = []): Promise<number> {
    try {
      const result = await this.pool.query(sql, params);
      return result.rowCount || 0;
    } catch (err) {
      console.error('[Database] Execute error:', err);
      throw err;
    }
  }

  async createToolAuditTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS tool_audit (
        id SERIAL PRIMARY KEY,
        tool_name VARCHAR(255) NOT NULL,
        agent_id VARCHAR(255),
        payment_status VARCHAR(50),
        execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        result_hash VARCHAR(255),
        metadata JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_tool_audit_tool ON tool_audit(tool_name);
      CREATE INDEX IF NOT EXISTS idx_tool_audit_agent ON tool_audit(agent_id);
      CREATE INDEX IF NOT EXISTS idx_tool_audit_time ON tool_audit(execution_time);
    `;
    await this.execute(sql);
    console.log('[Database] Tool audit table initialized');
  }

  async createToolUsageTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS tool_usage (
        id SERIAL PRIMARY KEY,
        tool_name VARCHAR(255) NOT NULL,
        daily_count INTEGER DEFAULT 0,
        total_revenue DECIMAL(18, 8) DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_usage_unique ON tool_usage(tool_name, date);
    `;
    await this.execute(sql);
    console.log('[Database] Tool usage table initialized');
  }

  async logToolExecution(
    toolName: string,
    agentId: string | null,
    paymentStatus: string,
    resultHash: string,
    metadata?: any
  ): Promise<void> {
    const sql = `
      INSERT INTO tool_audit (tool_name, agent_id, payment_status, result_hash, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await this.execute(sql, [toolName, agentId, paymentStatus, resultHash, metadata ? JSON.stringify(metadata) : null]);
  }

  async incrementToolUsage(toolName: string, revenue: number = 0): Promise<void> {
    const sql = `
      INSERT INTO tool_usage (tool_name, daily_count, total_revenue)
      VALUES ($1, 1, $2)
      ON CONFLICT (tool_name, date) DO UPDATE
      SET daily_count = daily_count + 1, total_revenue = total_revenue + $2
    `;
    await this.execute(sql, [toolName, revenue]);
  }

  async getToolUsageStats(toolName: string, days: number = 30): Promise<any[]> {
    const sql = `
      SELECT tool_name, date, daily_count, total_revenue
      FROM tool_usage
      WHERE tool_name = $1 AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
      ORDER BY date DESC
    `;
    return this.query(sql, [toolName, days]);
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    console.log('[Database] Connection pool closed');
  }
}

export const db = new DatabaseService();

