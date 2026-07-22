import { X402Price } from '../x402/types';
import * as crypto from 'crypto';

export interface PeerModelPayload {
  agentId: string;
  modelName?: string;
  payload: Record<string, any>;
}

export interface ConsensusAuditInput {
  payload: Record<string, any>;
  expectedSchema?: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object' | string>;
  peerPayloads?: PeerModelPayload[];
  domainContext?: 'FINANCIAL' | 'CODE' | 'LEGAL' | 'METRICS' | 'GENERAL';
  strictness?: 'STANDARD' | 'STRICT' | 'PARANOID';
}

export interface DiscrepancyItem {
  field: string;
  issueType:
    | 'HALLUCINATED_KEY'
    | 'TYPE_MISMATCH'
    | 'NUMERIC_OUTLIER'
    | 'CONTRADICTION'
    | 'IMPOSSIBLE_VALUE'
    | 'SCHEMA_VIOLATION'
    | 'PEER_DIVERGENCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  foundValue: any;
  suggestedValue?: any;
}

export interface ConsensusAuditOutput {
  auditId: string;
  isSanityPassed: boolean;
  consensusScore: number; // 0.0 to 100.0
  hallucinationRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceInterval: {
    min: number;
    max: number;
  };
  discrepancies: DiscrepancyItem[];
  peerAgreementRate?: number; // 0.0 to 100.0
  sanitizedPayload: Record<string, any>;
  auditedAt: number;
}

export class AgentConsensusOracleService {
  public static readonly PRICE: X402Price = {
    amount: 85,
    currency: 'USD_CENT',
    formatted: '$0.85 USD',
  };

  private readonly HallucinationKeywords = [
    'as an ai model',
    'i do not have access',
    'todo',
    '[insert',
    'placeholder',
    'lorem ipsum',
    'sample_key',
    'fake_hash',
    '0x1234567890abcdef',
    'your_api_key_here',
  ];

  /**
   * Audits structured JSON payloads for semantic sanity, hallucinations, and multi-model consensus.
   */
  public async auditConsensus(input: ConsensusAuditInput): Promise<ConsensusAuditOutput> {
    const {
      payload,
      expectedSchema,
      peerPayloads = [],
      domainContext = 'GENERAL',
      strictness = 'STANDARD',
    } = input;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Input payload must be a valid JSON object');
    }

    const auditId = `aud_${crypto.randomBytes(6).toString('hex')}`;
    const discrepancies: DiscrepancyItem[] = [];
    const sanitizedPayload: Record<string, any> = JSON.parse(JSON.stringify(payload));

    // 1. Audit numeric sanity & value bounds
    this.auditNumericSanity(sanitizedPayload, discrepancies, domainContext, '');

    // 2. Audit hallucination signatures & text anomalies
    this.auditHallucinations(sanitizedPayload, discrepancies, '');

    // 3. Audit against expected schema if provided
    if (expectedSchema) {
      this.auditSchemaCompliance(payload, expectedSchema, discrepancies);
    }

    // 4. Multi-model peer consensus comparison if peer payloads provided
    let peerAgreementRate: number | undefined;
    if (peerPayloads.length > 0) {
      peerAgreementRate = this.auditPeerConsensus(payload, peerPayloads, discrepancies);
    }

    // Calculate Scores & Metrics
    let scorePenalty = 0;
    for (const d of discrepancies) {
      switch (d.severity) {
        case 'CRITICAL':
          scorePenalty += 35;
          break;
        case 'HIGH':
          scorePenalty += 20;
          break;
        case 'MEDIUM':
          scorePenalty += 10;
          break;
        case 'LOW':
          scorePenalty += 5;
          break;
      }
    }

    if (strictness === 'STRICT') scorePenalty *= 1.25;
    if (strictness === 'PARANOID') scorePenalty *= 1.5;

    const consensusScore = Number(Math.max(0, Math.min(100, 100 - scorePenalty)).toFixed(2));
    const isSanityPassed = consensusScore >= (strictness === 'PARANOID' ? 90 : strictness === 'STRICT' ? 80 : 70);

    // Determine Risk Level
    let hallucinationRisk: ConsensusAuditOutput['hallucinationRisk'] = 'NONE';
    const criticalCount = discrepancies.filter((d) => d.severity === 'CRITICAL').length;
    const highCount = discrepancies.filter((d) => d.severity === 'HIGH').length;

    if (criticalCount > 0 || consensusScore < 40) {
      hallucinationRisk = 'CRITICAL';
    } else if (highCount > 1 || consensusScore < 60) {
      hallucinationRisk = 'HIGH';
    } else if (highCount === 1 || consensusScore < 80) {
      hallucinationRisk = 'MEDIUM';
    } else if (discrepancies.length > 0) {
      hallucinationRisk = 'LOW';
    }

    // Compute confidence interval
    const margin = (100 - consensusScore) * 0.15 + (peerAgreementRate !== undefined ? (100 - peerAgreementRate) * 0.1 : 5);
    const confidenceInterval = {
      min: Number(Math.max(0, consensusScore - margin).toFixed(2)),
      max: Number(Math.min(100, consensusScore + margin).toFixed(2)),
    };

    return {
      auditId,
      isSanityPassed,
      consensusScore,
      hallucinationRisk,
      confidenceInterval,
      discrepancies,
      peerAgreementRate,
      sanitizedPayload,
      auditedAt: Date.now(),
    };
  }

  // --- Sub-Auditor Routines ---

  private auditNumericSanity(
    obj: Record<string, any>,
    discrepancies: DiscrepancyItem[],
    domainContext: string,
    pathPrefix: string
  ): void {
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

      if (typeof value === 'number') {
        // NaN or Infinity check
        if (Number.isNaN(value) || !Number.isFinite(value)) {
          discrepancies.push({
            field: currentPath,
            issueType: 'IMPOSSIBLE_VALUE',
            severity: 'CRITICAL',
            description: `Field '${currentPath}' contains invalid non-finite numeric value (${value})`,
            foundValue: value,
            suggestedValue: 0,
          });
          obj[key] = 0;
          continue;
        }

        // Domain checks (Financial & General)
        const lowerKey = key.toLowerCase();
        if ((lowerKey.includes('price') || lowerKey.includes('amount') || lowerKey.includes('volume') || lowerKey.includes('fee')) && value < 0) {
          discrepancies.push({
            field: currentPath,
            issueType: 'NUMERIC_OUTLIER',
            severity: 'HIGH',
            description: `Financial metric '${currentPath}' cannot be negative (${value})`,
            foundValue: value,
            suggestedValue: Math.abs(value),
          });
          obj[key] = Math.abs(value);
        }

        // Timestamp sanity check
        if (lowerKey.includes('timestamp') || lowerKey.includes('createdat') || lowerKey.includes('expiresat')) {
          if (value > now + 5 * oneYearMs || value < 946684800000) {
            // Before year 2000 or > 5 years in future
            discrepancies.push({
              field: currentPath,
              issueType: 'IMPOSSIBLE_VALUE',
              severity: 'HIGH',
              description: `Timestamp '${currentPath}' is outside sane temporal boundaries (${new Date(value).toISOString()})`,
              foundValue: value,
              suggestedValue: now,
            });
          }
        }

        // Extreme scalar outlier check (> 1 Trillion without specified domain)
        if (Math.abs(value) > 1e12 && domainContext !== 'FINANCIAL') {
          discrepancies.push({
            field: currentPath,
            issueType: 'NUMERIC_OUTLIER',
            severity: 'MEDIUM',
            description: `Scalar value '${currentPath}' is suspiciously large (${value})`,
            foundValue: value,
          });
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.auditNumericSanity(value, discrepancies, domainContext, currentPath);
      }
    }
  }

  private auditHallucinations(
    obj: Record<string, any>,
    discrepancies: DiscrepancyItem[],
    pathPrefix: string
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

      if (typeof value === 'string') {
        const lowerStr = value.toLowerCase();

        for (const keyword of this.HallucinationKeywords) {
          if (lowerStr.includes(keyword)) {
            discrepancies.push({
              field: currentPath,
              issueType: 'HALLUCINATED_KEY',
              severity: 'HIGH',
              description: `Hallucination pattern '${keyword}' detected in field '${currentPath}'`,
              foundValue: value,
              suggestedValue: '[REDACTED_HALLUCINATION]',
            });
            obj[key] = '[REDACTED_HALLUCINATION]';
            break;
          }
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.auditHallucinations(value, discrepancies, currentPath);
      }
    }
  }

  private auditSchemaCompliance(
    payload: Record<string, any>,
    schema: Record<string, string>,
    discrepancies: DiscrepancyItem[]
  ): void {
    for (const [expectedKey, expectedType] of Object.entries(schema)) {
      if (!(expectedKey in payload)) {
        discrepancies.push({
          field: expectedKey,
          issueType: 'SCHEMA_VIOLATION',
          severity: 'HIGH',
          description: `Missing required schema field '${expectedKey}'`,
          foundValue: undefined,
        });
        continue;
      }

      const actualValue = payload[expectedKey];
      const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue;

      if (expectedType.toLowerCase() !== actualType.toLowerCase()) {
        discrepancies.push({
          field: expectedKey,
          issueType: 'TYPE_MISMATCH',
          severity: 'MEDIUM',
          description: `Field '${expectedKey}' type mismatch. Expected '${expectedType}', got '${actualType}'`,
          foundValue: actualValue,
        });
      }
    }
  }

  private auditPeerConsensus(
    primaryPayload: Record<string, any>,
    peers: PeerModelPayload[],
    discrepancies: DiscrepancyItem[]
  ): number {
    const keys = Object.keys(primaryPayload);
    if (keys.length === 0) return 100;

    let totalMatchCount = 0;
    let totalCheckCount = 0;

    for (const key of keys) {
      const primaryVal = JSON.stringify(primaryPayload[key]);
      let keyMatchCount = 0;

      for (const peer of peers) {
        totalCheckCount++;
        const peerVal = JSON.stringify(peer.payload[key]);
        if (primaryVal === peerVal) {
          keyMatchCount++;
          totalMatchCount++;
        }
      }

      const agreementRatio = keyMatchCount / peers.length;
      if (agreementRatio < 0.5 && peers.length >= 2) {
        discrepancies.push({
          field: key,
          issueType: 'PEER_DIVERGENCE',
          severity: 'MEDIUM',
          description: `Field '${key}' diverges from peer model majority (Agreement: ${(agreementRatio * 100).toFixed(0)}%)`,
          foundValue: primaryPayload[key],
        });
      }
    }

    return totalCheckCount > 0 ? Number(((totalMatchCount / totalCheckCount) * 100).toFixed(2)) : 100;
  }
}
