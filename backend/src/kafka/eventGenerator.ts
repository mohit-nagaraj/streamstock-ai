/**
 * Event Generator for StreamStock AI
 * Simulates real-time inventory events (sales, restocks, returns)
 */

import { v4 as uuidv4 } from 'uuid';
import { Event, EventType, Product } from '../models/types';
import { productStore } from '../stores/InMemoryStore';
import { sendEvent } from './producer';

// Configuration
interface EventGeneratorConfig {
  eventsPerMinute: number; // Total events per minute
  salesWeight: number; // 0-1 (e.g., 0.65 = 65% sales)
  restockWeight: number; // 0-1
  returnWeight: number; // 0-1
  enabled: boolean;
}

const DEFAULT_CONFIG: EventGeneratorConfig = {
  eventsPerMinute: 10, // 10 events/minute as per PRD
  salesWeight: 0.65, // 65% sales
  restockWeight: 0.25, // 25% restocks
  returnWeight: 0.10, // 10% returns
  enabled: true,
};

let currentConfig: EventGeneratorConfig = { ...DEFAULT_CONFIG };
let generatorInterval: NodeJS.Timeout | null = null;
let eventCounter = 0;

/**
 * Start event generator
 */
export function startEventGenerator(config?: Partial<EventGeneratorConfig>): void {
  if (generatorInterval) {
    console.log('⚠️  Event generator already running');
    return;
  }

  // Merge config
  currentConfig = { ...DEFAULT_CONFIG, ...config };

  // Calculate interval (ms between events)
  const intervalMs = (60 * 1000) / currentConfig.eventsPerMinute;

  console.log(`🚀 Starting event generator:`);
  console.log(`   - Events per minute: ${currentConfig.eventsPerMinute}`);
  console.log(`   - Interval: ${intervalMs.toFixed(0)}ms between events`);
  console.log(`   - Distribution: ${(currentConfig.salesWeight * 100).toFixed(0)}% sales, ${(currentConfig.restockWeight * 100).toFixed(0)}% restocks, ${(currentConfig.returnWeight * 100).toFixed(0)}% returns`);

  generatorInterval = setInterval(async () => {
    if (currentConfig.enabled) {
      await generateAndSendEvent();
    }
  }, intervalMs);
}

/**
 * Stop event generator
 */
export function stopEventGenerator(): void {
  if (generatorInterval) {
    clearInterval(generatorInterval);
    generatorInterval = null;
    console.log('⏹️  Event generator stopped');
  }
}

/**
 * Update generator configuration
 */
export function updateConfig(config: Partial<EventGeneratorConfig>): void {
  const oldRate = currentConfig.eventsPerMinute;
  currentConfig = { ...currentConfig, ...config };

  // Restart generator if rate changed
  if (oldRate !== currentConfig.eventsPerMinute && generatorInterval) {
    stopEventGenerator();
    startEventGenerator();
  }

  console.log('⚙️  Event generator config updated:', currentConfig);
}

/**
 * Generate and send a single event
 */
async function generateAndSendEvent(): Promise<void> {
  try {
    const products = productStore.getAll();
    if (products.length === 0) {
      console.warn('⚠️  No products available for event generation');
      return;
    }

    // Select random product (weighted by stock level for sales)
    const product = selectRandomProduct(products);
    const eventType = selectEventType();
    const event = createEvent(product, eventType);

    // Send to Kafka
    await sendEvent(event);
    eventCounter++;
  } catch (error) {
    console.error('❌ Error generating event:', error);
  }
}

/**
 * Select random product (weighted by stock for sales)
 */
function selectRandomProduct(products: Product[]): Product {
  // For sales, prefer products with higher stock
  // For restocks, prefer products with lower stock
  return products[Math.floor(Math.random() * products.length)];
}

/**
 * Select event type based on configured weights
 */
function selectEventType(): EventType {
  const rand = Math.random();
  const { salesWeight, restockWeight, returnWeight } = currentConfig;

  if (rand < salesWeight) return 'SALE';
  if (rand < salesWeight + restockWeight) return 'RESTOCK';
  return 'RETURN';
}

/**
 * Create event object
 */
function createEvent(product: Product, eventType: EventType): Event {
  const quantity = generateQuantity(eventType, product);

  return {
    id: `EVT-${String(++eventCounter).padStart(8, '0')}`,
    type: eventType,
    productId: product.id,
    quantity,
    warehouse: product.warehouse,
    timestamp: new Date(),
    metadata: {
      generated: true,
      productName: product.name,
      category: product.category,
    },
  };
}

/**
 * Generate quantity based on event type and product state
 */
function generateQuantity(eventType: EventType, product: Product): number {
  switch (eventType) {
    case 'SALE':
      // Sales: 1-10 units, but not more than current stock
      const maxSale = Math.min(10, product.currentStock);
      return Math.floor(Math.random() * maxSale) + 1;

    case 'RESTOCK':
      // Restock: Enough to reach ~70% of max capacity
      const targetStock = product.maxCapacity * 0.7;
      const neededStock = Math.max(100, targetStock - product.currentStock);
      return Math.floor(neededStock);

    case 'RETURN':
      // Returns: 1-5 units
      return Math.floor(Math.random() * 5) + 1;

    default:
      return 1;
  }
}

/**
 * Get generator stats
 */
export function getGeneratorStats() {
  return {
    running: generatorInterval !== null,
    config: currentConfig,
    totalEventsGenerated: eventCounter,
  };
}

/**
 * Reset event counter
 */
export function resetEventCounter(): void {
  eventCounter = 0;
}
