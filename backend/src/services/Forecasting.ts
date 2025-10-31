/**
 * Forecasting Service for StreamStock AI
 * Uses Simple Moving Average (SMA) for stock predictions
 */

import { Event, Product } from '../models/types';

export interface ForecastResult {
  productId: string;
  productName: string;
  currentStock: number;
  predictedStock7d: number;
  predictedDemand7d: number;
  reorderRecommended: boolean;
  confidence: number;
  forecastDate: string;
}

/**
 * Calculate Simple Moving Average forecast
 * Uses last N days of sales/restocks/returns to predict future stock
 */
export function calculateSMAForecast(
  product: Product,
  events: Event[],
  daysToForecast: number = 7,
  historicalDays: number = 30
): ForecastResult {
  // Filter events for this product
  const productEvents = events.filter(e => e.productId === product.id);

  // Calculate average daily stock change
  const dailyChanges = calculateDailyStockChanges(productEvents, historicalDays);
  const avgDailyChange = dailyChanges.reduce((sum, val) => sum + val, 0) / dailyChanges.length || 0;

  // Project forward
  const predictedStock = Math.max(0, product.currentStock + (avgDailyChange * daysToForecast));
  const predictedDemand = Math.abs(avgDailyChange * daysToForecast);

  // Determine if reorder is needed
  const reorderRecommended = predictedStock < product.reorderPoint;

  // Calculate confidence based on data consistency
  const confidence = calculateConfidence(dailyChanges);

  return {
    productId: product.id,
    productName: product.name,
    currentStock: product.currentStock,
    predictedStock7d: Math.round(predictedStock),
    predictedDemand7d: Math.round(predictedDemand),
    reorderRecommended,
    confidence,
    forecastDate: new Date().toISOString(),
  };
}

/**
 * Calculate daily stock changes from events
 */
function calculateDailyStockChanges(events: Event[], days: number): number[] {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Group events by day
  const dailyChanges: Map<string, number> = new Map();

  events.forEach(event => {
    const eventDate = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);

    if (eventDate >= startDate) {
      const dayKey = eventDate.toISOString().split('T')[0];
      const currentChange = dailyChanges.get(dayKey) || 0;

      let change = 0;
      switch (event.type) {
        case 'SALE':
          change = -event.quantity;
          break;
        case 'RESTOCK':
          change = event.quantity;
          break;
        case 'RETURN':
          change = event.quantity;
          break;
      }

      dailyChanges.set(dayKey, currentChange + change);
    }
  });

  return Array.from(dailyChanges.values());
}

/**
 * Calculate forecast confidence based on data variance
 */
function calculateConfidence(values: number[]): number {
  if (values.length < 2) return 0.5;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Lower standard deviation = higher confidence
  const coefficientOfVariation = mean !== 0 ? Math.abs(stdDev / mean) : 1;
  const confidence = Math.max(0.1, Math.min(0.95, 1 - coefficientOfVariation));

  return Math.round(confidence * 100) / 100;
}

/**
 * Generate forecasts for multiple products
 */
export function generateForecasts(
  products: Product[],
  events: Event[],
  daysToForecast: number = 7
): ForecastResult[] {
  return products.map(product => calculateSMAForecast(product, events, daysToForecast));
}
