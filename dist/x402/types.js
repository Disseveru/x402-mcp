"use strict";
/**
 * x402 Protocol Types - Agent-to-Agent Payment Standard
 * Implements HTTP 402 Payment Required spec v2 for machine payments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatX402Price = formatX402Price;
exports.normalizeToUSD = normalizeToUSD;
/**
 * Format helper for micro-pricing down to $0.001 USD and below
 */
function formatX402Price(amount, currency = 'USD') {
    let formatted = '';
    if (currency === 'USD') {
        if (amount < 0.01) {
            formatted = `$${amount.toFixed(3)} USD`;
        }
        else {
            formatted = `$${amount.toFixed(2)} USD`;
        }
    }
    else if (currency === 'USD_CENT') {
        const usdAmount = amount / 100;
        if (usdAmount < 0.01) {
            formatted = `$${usdAmount.toFixed(3)} USD`;
        }
        else {
            formatted = `$${usdAmount.toFixed(2)} USD`;
        }
    }
    else if (currency === 'USD_MICRO') {
        const usdAmount = amount / 1000000;
        formatted = `$${usdAmount.toFixed(4)} USD`;
    }
    else {
        formatted = `${amount} ${currency}`;
    }
    return { amount, currency, formatted };
}
/**
 * Normalizes price amounts to USD equivalent for accurate micro-pricing comparisons
 */
function normalizeToUSD(price) {
    if (price.currency === 'USD')
        return price.amount;
    if (price.currency === 'USD_CENT')
        return price.amount / 100;
    if (price.currency === 'USD_MICRO')
        return price.amount / 1000000;
    return price.amount;
}
