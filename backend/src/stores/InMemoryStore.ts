/**
 * In-Memory Data Store for StreamStock AI
 * Provides fast CRUD operations for real-time event processing
 */

import { Product, Event, Alert, Warehouse } from '../models/types';

/**
 * Generic in-memory store with CRUD operations
 */
class InMemoryStore<T extends { id: string }> {
  private data: Map<string, T>;

  constructor() {
    this.data = new Map();
  }

  // Create
  create(item: T): T {
    this.data.set(item.id, item);
    return item;
  }

  // Read
  get(id: string): T | undefined {
    return this.data.get(id);
  }

  // Read all
  getAll(): T[] {
    return Array.from(this.data.values());
  }

  // Update
  update(id: string, updates: Partial<T>): T | undefined {
    const existing = this.data.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.data.set(id, updated);
    return updated;
  }

  // Delete
  delete(id: string): boolean {
    return this.data.delete(id);
  }

  // Find by condition
  find(predicate: (item: T) => boolean): T[] {
    return Array.from(this.data.values()).filter(predicate);
  }

  // Find one by condition
  findOne(predicate: (item: T) => boolean): T | undefined {
    return Array.from(this.data.values()).find(predicate);
  }

  // Count
  count(): number {
    return this.data.size;
  }

  // Clear all
  clear(): void {
    this.data.clear();
  }

  // Check if exists
  exists(id: string): boolean {
    return this.data.has(id);
  }
}

/**
 * Product Store
 */
class ProductStore extends InMemoryStore<Product> {
  // Get products by warehouse
  getByWarehouse(warehouse: string): Product[] {
    return this.find((p) => p.warehouse === warehouse);
  }

  // Get low stock products
  getLowStock(): Product[] {
    return this.find((p) => p.currentStock < p.reorderPoint);
  }

  // Get critical stock products
  getCriticalStock(): Product[] {
    return this.find((p) => p.currentStock < 10);
  }

  // Get by category
  getByCategory(category: string): Product[] {
    return this.find((p) => p.category === category);
  }

  // Update stock level
  updateStock(productId: string, quantity: number): Product | undefined {
    const product = this.get(productId);
    if (!product) return undefined;

    return this.update(productId, {
      currentStock: product.currentStock + quantity,
      lastUpdated: new Date(),
    } as Partial<Product>);
  }

  // Get total stock value
  getTotalValue(): number {
    return this.getAll().reduce(
      (sum, p) => sum + p.currentStock * p.unitPrice,
      0
    );
  }
}

/**
 * Event Store
 */
class EventStore extends InMemoryStore<Event> {
  // Get events by product
  getByProduct(productId: string): Event[] {
    return this.find((e) => e.productId === productId);
  }

  // Get events by type
  getByType(type: Event['type']): Event[] {
    return this.find((e) => e.type === type);
  }

  // Get events by time range
  getByTimeRange(startDate: Date, endDate: Date): Event[] {
    return this.find(
      (e) => e.timestamp >= startDate && e.timestamp <= endDate
    );
  }

  // Get recent events
  getRecent(limit: number = 20): Event[] {
    return this.getAll()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get events by warehouse
  getByWarehouse(warehouse: string): Event[] {
    return this.find((e) => e.warehouse === warehouse);
  }
}

/**
 * Alert Store
 */
class AlertStore extends InMemoryStore<Alert> {
  // Get active (unresolved) alerts
  getActive(): Alert[] {
    return this.find((a) => !a.resolved);
  }

  // Get alerts by product
  getByProduct(productId: string): Alert[] {
    return this.find((a) => a.productId === productId);
  }

  // Get alerts by severity
  getBySeverity(severity: Alert['severity']): Alert[] {
    return this.find((a) => a.severity === severity);
  }

  // Get critical alerts
  getCritical(): Alert[] {
    return this.find((a) => a.severity === 'critical' && !a.resolved);
  }

  // Resolve alert
  resolve(alertId: string): Alert | undefined {
    return this.update(alertId, {
      resolved: true,
      resolvedAt: new Date(),
    } as Partial<Alert>);
  }

  // Get recent alerts
  getRecent(limit: number = 100): Alert[] {
    return this.getAll()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Clean up expired alerts (older than 24 hours and resolved)
  cleanupExpired(): number {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let count = 0;

    this.getAll().forEach((alert) => {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < oneDayAgo) {
        this.delete(alert.id);
        count++;
      }
    });

    return count;
  }
}

/**
 * Warehouse Store
 */
class WarehouseStore extends InMemoryStore<Warehouse> {
  // Update warehouse utilization
  updateUtilization(warehouseId: string, utilization: number): Warehouse | undefined {
    return this.update(warehouseId, {
      currentUtilization: utilization,
    } as Partial<Warehouse>);
  }
}

// Create singleton instances
export const productStore = new ProductStore();
export const eventStore = new EventStore();
export const alertStore = new AlertStore();
export const warehouseStore = new WarehouseStore();

// Export store classes for testing
export { ProductStore, EventStore, AlertStore, WarehouseStore, InMemoryStore };
