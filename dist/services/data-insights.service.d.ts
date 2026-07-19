import { X402Price } from '../x402/types';
export interface DataQueryInput {
    ticker: string;
    timeframe: '1h' | '24h' | '7d' | '30d';
    metrics: Array<'volatility' | 'sentiment' | 'order_book_depth' | 'whale_flow'>;
}
export interface DataQueryOutput {
    ticker: string;
    timestamp: number;
    priceUSD: number;
    metricsResult: Record<string, any>;
    confidenceScore: number;
    dataProvider: string;
}
export declare class DataInsightsService {
    static readonly PRICE: X402Price;
    fetchInsights(input: DataQueryInput): Promise<DataQueryOutput>;
}
