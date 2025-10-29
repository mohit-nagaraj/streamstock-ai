/**
 * Data Seeder for StreamStock AI
 * Generates demo products, warehouses, and 30 days of historical events
 */

import { v4 as uuidv4 } from 'uuid';
import { Product, Warehouse, Event, EventType } from '../models/types';
import { productStore, warehouseStore, eventStore } from '../stores/InMemoryStore';
import { eventHandler } from '../services/EventHandler';

// Sample data
const CATEGORIES = ['Electronics', 'Apparel', 'Home Goods'];
const WAREHOUSE_LOCATIONS = ['West Coast', 'East Coast', 'Midwest'];

const PRODUCT_NAMES = {
  Electronics: ['Laptop Pro', 'Wireless Mouse', 'USB-C Hub', '4K Monitor', 'Mechanical Keyboard'],
  Apparel: ['Cotton T-Shirt', 'Denim Jeans', 'Running Shoes', 'Winter Jacket', 'Baseball Cap'],
  'Home Goods': ['Coffee Maker', 'Desk Lamp', 'Storage Bins', 'Kitchen Utensils', 'Throw Pillows']
};

/**
 * Generate warehouses
 */
function generateWarehouses(): Warehouse[] {
  const warehouses: Warehouse[] = WAREHOUSE_LOCATIONS.map((location, index) => ({
    id: `WH-${index + 1}`,
    name: `${location} Warehouse`,
    location,
    capacity: 10000,
    currentUtilization: 0
  }));

  warehouses.forEach(w => warehouseStore.create(w));
  console.log(`✅ Created ${warehouses.length} warehouses`);
  return warehouses;
}

/**
 * Generate products (10-15 items)
 */
function generateProducts(warehouses: Warehouse[]): Product[] {
  const products: Product[] = [];
  let productCount = 0;

  CATEGORIES.forEach(category => {
    const productNames = PRODUCT_NAMES[category as keyof typeof PRODUCT_NAMES];
    const numProducts = Math.floor(Math.random() * 2) + 3; // 3-4 products per category

    for (let i = 0; i < Math.min(numProducts, productNames.length); i++) {
      productCount++;
      const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
      const baseStock = Math.floor(Math.random() * 400) + 100; // 100-500 units

      const product: Product = {
        id: `PROD-${String(productCount).padStart(3, '0')}`,
        sku: `SKU-${category.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        name: productNames[i],
        category,
        warehouse: warehouse.id,
        currentStock: baseStock,
        reorderPoint: Math.floor(baseStock * 0.3), // 30% of initial stock
        maxCapacity: baseStock * 2,
        unitPrice: parseFloat((Math.random() * 200 + 20).toFixed(2)), // $20-$220
        predictedStock7d: baseStock, // Will be updated by forecasting
        lastUpdated: new Date()
      };

      products.push(product);
      productStore.create(product);
    }
  });

  console.log(`✅ Created ${products.length} products across ${CATEGORIES.length} categories`);
  return products;
}

/**
 * Generate 30 days of historical events
 */
async function generateHistoricalEvents(products: Product[]): Promise<void> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let eventCount = 0;
  const eventsPerDay = 20; // Average events per day

  // Generate events for each day
  for (let day = 0; day < 30; day++) {
    const eventDate = new Date(thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000);

    for (let i = 0; i < eventsPerDay; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const eventType = selectEventType();
      const quantity = generateQuantity(eventType);

      // Add random hours/minutes to spread events throughout the day
      const timestamp = new Date(
        eventDate.getTime() +
        Math.floor(Math.random() * 24 * 60 * 60 * 1000)
      );

      const event: Event = {
        id: `EVT-${String(++eventCount).padStart(6, '0')}`,
        type: eventType,
        productId: product.id,
        quantity,
        warehouse: product.warehouse,
        timestamp,
        metadata: {
          historical: true,
          day: day + 1
        }
      };

      // Process event to update stock and trigger alerts
      await eventHandler.processEvent(event);
    }
  }

  console.log(`✅ Generated ${eventCount} historical events over 30 days`);
  console.log(`   - Average: ${(eventCount / 30).toFixed(1)} events/day`);
}

/**
 * Select event type with realistic distribution
 */
function selectEventType(): EventType {
  const rand = Math.random();
  if (rand < 0.65) return 'SALE';      // 65% sales
  if (rand < 0.90) return 'RESTOCK';   // 25% restocks
  return 'RETURN';                      // 10% returns
}

/**
 * Generate quantity based on event type
 */
function generateQuantity(eventType: EventType): number {
  switch (eventType) {
    case 'SALE':
      return Math.floor(Math.random() * 10) + 1; // 1-10 units
    case 'RESTOCK':
      return Math.floor(Math.random() * 200) + 100; // 100-300 units
    case 'RETURN':
      return Math.floor(Math.random() * 5) + 1; // 1-5 units
    default:
      return 1;
  }
}

/**
 * Display seeded data summary
 */
function displaySummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEEDED DATA SUMMARY');
  console.log('='.repeat(60));

  // Warehouses
  const warehouses = warehouseStore.getAll();
  console.log(`\n🏢 Warehouses: ${warehouses.length}`);
  warehouses.forEach(w => {
    console.log(`   - ${w.name} (${w.location})`);
  });

  // Products
  const products = productStore.getAll();
  console.log(`\n📦 Products: ${products.length}`);
  CATEGORIES.forEach(cat => {
    const count = products.filter(p => p.category === cat).length;
    console.log(`   - ${cat}: ${count} products`);
  });

  // Stock Status
  const lowStock = productStore.getLowStock();
  const criticalStock = productStore.getCriticalStock();
  console.log(`\n⚠️  Stock Status:`);
  console.log(`   - Low Stock Products: ${lowStock.length}`);
  console.log(`   - Critical Stock Products: ${criticalStock.length}`);
  console.log(`   - Total Stock Value: $${productStore.getTotalValue().toFixed(2)}`);

  // Events
  const events = eventStore.getAll();
  const salesEvents = eventStore.getByType('SALE');
  const restockEvents = eventStore.getByType('RESTOCK');
  const returnEvents = eventStore.getByType('RETURN');
  console.log(`\n📈 Events: ${events.length} total`);
  console.log(`   - Sales: ${salesEvents.length} (${((salesEvents.length / events.length) * 100).toFixed(1)}%)`);
  console.log(`   - Restocks: ${restockEvents.length} (${((restockEvents.length / events.length) * 100).toFixed(1)}%)`);
  console.log(`   - Returns: ${returnEvents.length} (${((returnEvents.length / events.length) * 100).toFixed(1)}%)`);

  // Alerts
  const alerts = eventHandler.getActiveAlerts();
  console.log(`\n🚨 Active Alerts: ${alerts.length}`);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');
  console.log(`   - Critical: ${criticalAlerts.length}`);
  console.log(`   - Warning: ${warningAlerts.length}`);
  console.log(`   - Info: ${infoAlerts.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Data seeding complete!\n');
}

/**
 * Main seeder function
 */
export async function seedData(): Promise<void> {
  console.log('\n🌱 Starting data seeding...\n');

  // Clear existing data
  productStore.clear();
  warehouseStore.clear();
  eventStore.clear();

  // Generate data
  const warehouses = generateWarehouses();
  const products = generateProducts(warehouses);
  await generateHistoricalEvents(products);

  // Display summary
  displaySummary();
}

// Run seeder if executed directly
if (require.main === module) {
  seedData().catch(console.error);
}
