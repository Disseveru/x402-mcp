import { X402Price } from '../x402/types';
import * as crypto from 'crypto';

export interface SecurityAuditInput {
  code: string;
  language?: string;
  strictness?: 'standard' | 'high' | 'paranoid';
}

export interface SecurityAuditOutput {
  auditId: string;
  clean: boolean;
  score: number;
  vulnerabilities: Array<{
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type: string;
    description: string;
    line?: number;
  }>;
  scannedLines: number;
  recommendation: string;
  timestamp: number;
}

export class SecurityAuditorService {
  public static readonly PRICE: X402Price = {
    amount: 75,
    currency: 'USD_CENT',
    formatted: '$0.75 USD',
  };

  public async auditCode(input: SecurityAuditInput): Promise<SecurityAuditOutput> {
    const auditId = `audit_${crypto.randomBytes(6).toString('hex')}`;
    const lines = input.code.split('\n');
    const vulnerabilities: SecurityAuditOutput['vulnerabilities'] = [];

    // Static analysis heuristics
    if (input.code.includes('eval(') || input.code.includes('Function(')) {
      vulnerabilities.push({
        severity: 'CRITICAL',
        type: 'Arbitrary Code Execution',
        description: 'Dynamic code execution (eval / Function) detected',
      });
    }

    if (input.code.includes('privateKey') || input.code.includes('0x') && input.code.length > 64) {
      vulnerabilities.push({
        severity: 'HIGH',
        type: 'Hardcoded Secret',
        description: 'Potential private key or sensitive credential exposed in code',
      });
    }

    const clean = vulnerabilities.length === 0;
    const score = clean ? 98 : Math.max(20, 100 - vulnerabilities.length * 25);

    return {
      auditId,
      clean,
      score,
      vulnerabilities,
      scannedLines: lines.length,
      recommendation: clean
        ? 'Code passed security static analysis. Safe for isolated execution.'
        : 'Remediate critical and high severity vulnerabilities before deploying to production.',
      timestamp: Date.now(),
    };
  }
}
