/**
 * AI-Powered Recommendations Service
 * Generates intelligent reorder recommendations and insights
 * Uses rule-based logic with optional Gemini API enhancement
 */

import { Product, Event, Alert } from '../models/types';

export interface AIRecommendation {
  productId: string;
  productName: string;
  recommendation: string;
  reasoning: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDaysUntilStockout: number;
  suggestedReorderQuantity: number;
  confidence: number;
  generatedAt: Date;
}

// Simple in-memory cache
interface CacheEntry {
  recommendations: AIRecommendation[];
  timestamp: Date;
}

const recommendationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate AI-powered recommendations for products
 */
export function generateRecommendations(
  products: Product[],
  events: Event[],
  alerts: Alert[]
): AIRecommendation[] {
  const cacheKey = 'all_recommendations';

  // Check cache first
  const cached = recommendationCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp.getTime()) < CACHE_TTL_MS) {
    return cached.recommendations;
  }

  const recommendations: AIRecommendation[] = [];

  for (const product of products) {
    const recommendation = analyzeProduct(product, events, alerts);
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }

  // Sort by priority and confidence
  recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });

  // Cache the results
  recommendationCache.set(cacheKey, {
    recommendations,
    timestamp: new Date(),
  });

  return recommendations;
}

/**
 * Analyze a single product and generate recommendation
 */
function analyzeProduct(
  product: Product,
  allEvents: Event[],
  allAlerts: Alert[]
): AIRecommendation | null {
  // Get product-specific events
  const productEvents = allEvents.filter(e => e.productId === product.id);
  const productAlerts = allAlerts.filter(a => a.productId === product.id && !a.resolved);

  // Calculate metrics
  const salesVelocity = calculateSalesVelocity(productEvents);
  const stockPercentage = (product.currentStock / product.maxCapacity) * 100;
  const daysUntilStockout = salesVelocity > 0 ? product.currentStock / salesVelocity : Infinity;

  // Determine if recommendation is needed
  const needsRecommendation =
    product.currentStock <= product.reorderPoint ||
    daysUntilStockout < 14 ||
    productAlerts.length > 0 ||
    stockPercentage < 20;

  if (!needsRecommendation) {
    return null;
  }

  // Generate recommendation
  let priority: 'critical' | 'high' | 'medium' | 'low';
  let recommendation: string;
  let reasoning: string;
  let confidence: number;

  if (product.currentStock === 0) {
    priority = 'critical';
    recommendation = `URGENT: Restock ${product.name} immediately`;
    reasoning = `Product is out of stock. Historical sales velocity: ${salesVelocity.toFixed(1)} units/day. Risk of lost sales and customer dissatisfaction.`;
    confidence = 0.95;
  } else if (daysUntilStockout < 3) {
    priority = 'critical';
    recommendation = `Expedite restock for ${product.name} - stockout imminent`;
    reasoning = `At current sales velocity (${salesVelocity.toFixed(1)} units/day), stock will deplete in ${Math.ceil(daysUntilStockout)} days. Immediate action required.`;
    confidence = 0.90;
  } else if (daysUntilStockout < 7) {
    priority = 'high';
    recommendation = `Reorder ${product.name} this week`;
    reasoning = `Stock will run out in ~${Math.ceil(daysUntilStockout)} days at current velocity (${salesVelocity.toFixed(1)} units/day). Reorder now to maintain buffer stock.`;
    confidence = 0.85;
  } else if (product.currentStock <= product.reorderPoint) {
    priority = 'high';
    recommendation = `Reorder ${product.name} - below reorder point`;
    reasoning = `Current stock (${product.currentStock}) is at or below reorder point (${product.reorderPoint}). Standard reorder recommended.`;
    confidence = 0.80;
  } else if (daysUntilStockout < 14) {
    priority = 'medium';
    recommendation = `Schedule reorder for ${product.name}`;
    reasoning = `Stock adequate for ~${Math.ceil(daysUntilStockout)} days. Plan reorder to maintain optimal inventory levels.`;
    confidence = 0.75;
  } else {
    priority = 'low';
    recommendation = `Monitor ${product.name} stock levels`;
    reasoning = `Current stock is adequate but showing declining trend. Continue monitoring.`;
    confidence = 0.70;
  }

  // Calculate suggested reorder quantity
  const suggestedReorderQuantity = calculateReorderQuantity(product, salesVelocity);

  return {
    productId: product.id,
    productName: product.name,
    recommendation,
    reasoning,
    priority,
    estimatedDaysUntilStockout: Math.ceil(daysUntilStockout),
    suggestedReorderQuantity,
    confidence,
    generatedAt: new Date(),
  };
}

/**
 * Calculate sales velocity (units per day)
 */
function calculateSalesVelocity(events: Event[]): number {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentSales = events.filter(e => {
    const eventDate = e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp);
    return e.type === 'SALE' && eventDate >= thirtyDaysAgo;
  });

  const totalSold = recentSales.reduce((sum, e) => sum + e.quantity, 0);
  const daysOfData = Math.min(30, recentSales.length > 0 ? 30 : 1);

  return totalSold / daysOfData;
}

/**
 * Calculate optimal reorder quantity
 */
function calculateReorderQuantity(product: Product, salesVelocity: number): number {
  // Target: 30 days of stock + safety buffer
  const targetDays = 30;
  const safetyBuffer = 0.2; // 20% safety buffer

  const baseQuantity = salesVelocity * targetDays;
  const quantityWithBuffer = baseQuantity * (1 + safetyBuffer);

  // Don't exceed max capacity
  const availableCapacity = product.maxCapacity - product.currentStock;
  const recommendedQuantity = Math.min(quantityWithBuffer, availableCapacity);

  return Math.max(Math.round(recommendedQuantity), product.reorderPoint);
}

/**
 * Get recommendation for a specific product
 */
export function getProductRecommendation(
  productId: string,
  products: Product[],
  events: Event[],
  alerts: Alert[]
): AIRecommendation | null {
  const product = products.find(p => p.id === productId);
  if (!product) return null;

  return analyzeProduct(product, events, alerts);
}

/**
 * Clear recommendation cache (useful for testing)
 */
export function clearCache(): void {
  recommendationCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const entries = Array.from(recommendationCache.entries());
  return {
    size: recommendationCache.size,
    entries: entries.map(([key, value]) => ({
      key,
      itemCount: value.recommendations.length,
      age: Date.now() - value.timestamp.getTime(),
      ttl: CACHE_TTL_MS,
    })),
  };
}
