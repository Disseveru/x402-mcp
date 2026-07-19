import { X402Price } from '../x402/types';
import * as crypto from 'crypto';

export interface ContextFirewallInput {
  payload: string;
  allowHtml?: boolean;
  strictness?: 'standard' | 'strict';
}

export interface ContextFirewallOutput {
  firewallId: string;
  safePayload: string;
  threatsDetected: Array<{
    category: 'PROMPT_INJECTION' | 'JAILBREAK' | 'CONTEXT_POISONING' | 'MALICIOUS_URL';
    matchedPattern: string;
  }>;
  actionTaken: 'PASSED' | 'SANITIZED' | 'BLOCKED';
  timestamp: number;
}

export class ContextFirewallService {
  public static readonly PRICE: X402Price = {
    amount: 40,
    currency: 'USD_CENT',
    formatted: '$0.40 USD',
  };

  public async sanitizePayload(input: ContextFirewallInput): Promise<ContextFirewallOutput> {
    const firewallId = `fw_${crypto.randomBytes(6).toString('hex')}`;
    const threats: ContextFirewallOutput['threatsDetected'] = [];
    let safePayload = input.payload;

    const injectionPatterns = [
      /ignore previous instructions/i,
      /system prompt/i,
      /you are now Dan/i,
      /override authorization/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(input.payload)) {
        threats.push({
          category: 'PROMPT_INJECTION',
          matchedPattern: pattern.source,
        });
        safePayload = safePayload.replace(pattern, '[REDACTED_INJECTION_ATTEMPT]');
      }
    }

    const actionTaken: ContextFirewallOutput['actionTaken'] =
      threats.length === 0 ? 'PASSED' : 'SANITIZED';

    return {
      firewallId,
      safePayload,
      threatsDetected: threats,
      actionTaken,
      timestamp: Date.now(),
    };
  }
}
