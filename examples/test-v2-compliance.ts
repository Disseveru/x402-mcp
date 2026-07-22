import express, { Request, Response } from 'express';
import { requireX402Payment, x402ExpressMiddleware, validateOrChallengeX402 } from '../x402/middleware';
import { X402Verifier } from '../x402/verifier';
import { formatX402Price, normalizeToUSD } from '../x402/types';

async function runTests() {
  console.log('=== STARTING X402 V2 COMPLIANCE UNIT TESTS ===');

  // Test 1: Micro-pricing formatting & normalization
  console.log('\n[1] Testing Micro-Pricing ($0.001 USD)...');
  const price1 = formatX402Price(0.001, 'USD');
  console.log('Formatted $0.001 USD:', price1);
  if (price1.formatted !== '$0.001 USD') {
    throw new Error(`Expected '$0.001 USD', got '${price1.formatted}'`);
  }

  const normalized = normalizeToUSD(price1);
  if (normalized !== 0.001) {
    throw new Error(`Expected normalized 0.001, got ${normalized}`);
  }
  console.log('✔ Micro-pricing tests passed!');

  // Test 2: Verifier & Challenge creation (v2 protocol version)
  console.log('\n[2] Testing Verifier x402 v2 challenge creation...');
  const verifier = new X402Verifier('test_secret_key_123', '0xMerchantWalletAddress');
  const challenge = verifier.createChallenge('test_tool', price1, { isValidator: true });
  
  if (challenge.version !== '2.0') {
    throw new Error(`Expected protocol version '2.0', got '${challenge.version}'`);
  }
  if (challenge.validatorMode !== true) {
    throw new Error(`Expected validatorMode true, got ${challenge.validatorMode}`);
  }
  console.log('Challenge created successfully:', challenge);
  console.log('✔ Verifier v2 challenge tests passed!');

  // Test 3: Express Middleware with unauthenticated request & validator mode
  console.log('\n[3] Testing Express Middleware 402 & Validator Auto-Indexing...');
  const app = express();
  app.use(express.json());

  app.get('/test-endpoint', requireX402Payment('micro_tool', price1, verifier), (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  const server = app.listen(0, async () => {
    const address = server.address() as any;
    const port = address.port;

    // A: Test regular unauthenticated request
    const resUnauth = await fetch(`http://localhost:${port}/test-endpoint`);
    console.log('Unauthenticated status code:', resUnauth.status);
    if (resUnauth.status !== 402) {
      throw new Error(`Expected HTTP 402, got ${resUnauth.status}`);
    }

    const payHeader = resUnauth.headers.get('payment-required') || resUnauth.headers.get('PAYMENT-REQUIRED');
    if (!payHeader) {
      throw new Error('Missing PAYMENT-REQUIRED header in HTTP 402 response');
    }

    const decodedHeader = JSON.parse(Buffer.from(payHeader, 'base64').toString('utf-8'));
    console.log('Decoded PAYMENT-REQUIRED header payload:', decodedHeader);
    if (decodedHeader.version !== '2.0') {
      throw new Error(`Header challenge version mismatch, expected '2.0', got ${decodedHeader.version}`);
    }

    // B: Test validator request (?validator=true)
    const resValidator = await fetch(`http://localhost:${port}/test-endpoint?validator=true`);
    console.log('Validator mode status code:', resValidator.status);
    if (resValidator.status !== 402) {
      throw new Error(`Expected HTTP 402 for validator mode, got ${resValidator.status}`);
    }

    const valPayHeader = resValidator.headers.get('payment-required') || resValidator.headers.get('PAYMENT-REQUIRED');
    const valDecoded = JSON.parse(Buffer.from(valPayHeader!, 'base64').toString('utf-8'));
    if (valDecoded.validatorMode !== true) {
      throw new Error('Expected validatorMode: true in validator challenge');
    }
    console.log('Validator challenge decoded header:', valDecoded);
    console.log('Validator indexing header:', resValidator.headers.get('x-validator-indexing'));

    server.close();
    console.log('\n✔ ALL X402 V2 COMPLIANCE TESTS PASSED SUCCESSFULLY!');
  });
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
