/**
 * Event Handler Service
 * Processes inventory events and triggers alerts based on business rules
 */

import { Event, Alert, Product, AlertType, AlertSeverity } from '../models/types';
import { productStore, eventStore, alertStore } from '../stores/InMemoryStore';
import { v4 as uuidv4 } from 'uuid';
import { getProductRecommendation } from './AIRecommendations';
import { broadcastEvent, broadcastProductUpdate, broadcastAlert, broadcastAlertResolution } from './WebSocketService';

export class EventHandler {
  /**
   * Process an inventory event (SALE, RESTOCK, RETURN)
   */
  async processEvent(event: Event): Promise<void> {
    // Store the event
    eventStore.create(event);

    // Broadcast event to all connected clients
    broadcastEvent(event);

    // Update product stock based on event type
    const product = productStore.get(event.productId);
    if (!product) {
      console.error(`Product not found: ${event.productId}`);
      return;
    }

    // Calculate stock change
    let stockChange = 0;
    switch (event.type) {
      case 'SALE':
        stockChange = -event.quantity;
        break;
      case 'RESTOCK':
        stockChange = event.quantity;
        break;
      case 'RETURN':
        stockChange = event.quantity;
        break;
      default:
        return;
    }

    // Update product stock
    const updatedProduct = productStore.updateStock(event.productId, stockChange);
    if (!updatedProduct) {
      console.error(`Failed to update stock for product: ${event.productId}`);
      return;
    }

    // Broadcast product update
    broadcastProductUpdate(updatedProduct);

    // Check for alert conditions
    await this.checkAlertConditions(updatedProduct, event);
  }

  /**
   * Check if any alert conditions are met for a product
   */
  private async checkAlertConditions(product: Product, event: Event): Promise<void> {
    const currentStock = product.currentStock;

    // 1. Critical Low Stock: currentStock < 10 units
    if (currentStock < 10 && currentStock >= 0) {
      this.createAlert(product, 'critical', 'CRITICAL_LOW_STOCK',
        `Critical: ${product.name} has only ${currentStock} units remaining!`);
    }

    // 2. Low Stock Warning: currentStock < reorderPoint
    else if (currentStock < product.reorderPoint) {
      this.createAlert(product, 'warning', 'LOW_STOCK',
        `Warning: ${product.name} stock (${currentStock}) below reorder point (${product.reorderPoint})`);
    }

    // 3. Overstock: currentStock > 90% of maxCapacity
    if (currentStock > product.maxCapacity * 0.9) {
      this.createAlert(product, 'info', 'OVERSTOCK',
        `Info: ${product.name} is overstocked (${currentStock}/${product.maxCapacity})`);
    }

    // 4. Rapid Depletion: Stock decreased > 30% in last hour
    if (event.type === 'SALE') {
      const rapidDepletion = await this.checkRapidDepletion(product);
      if (rapidDepletion) {
        this.createAlert(product, 'warning', 'RAPID_DEPLETION',
          `Warning: ${product.name} experiencing rapid depletion - stock decreased by >30% in the last hour`);
      }
    }

    // 5. Reorder Needed: Product hit reorder point
    if (currentStock <= product.reorderPoint && currentStock > 0) {
      this.createAlert(product, 'warning', 'REORDER_NEEDED',
        `Reorder needed for ${product.name} - current stock: ${currentStock}, reorder point: ${product.reorderPoint}`);
    }

    // Auto-resolve alerts when conditions no longer apply
    this.autoResolveAlerts(product);
  }

  /**
   * Check if stock is depleting rapidly (>30% decrease in last hour)
   */
  private async checkRapidDepletion(product: Product): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get events from the last hour for this product
    const recentEvents = eventStore
      .getByProduct(product.id)
      .filter(e => e.timestamp >= oneHourAgo);

    // Calculate net stock change
    let netChange = 0;
    recentEvents.forEach(event => {
      if (event.type === 'SALE') netChange -= event.quantity;
      if (event.type === 'RESTOCK' || event.type === 'RETURN') netChange += event.quantity;
    });

    // Check if depletion is > 30%
    const stockAtStartOfHour = product.currentStock - netChange;
    const depletionPercentage = Math.abs(netChange) / stockAtStartOfHour;

    return netChange < 0 && depletionPercentage > 0.3;
  }

  /**
   * Create an alert if it doesn't already exist
   */
  private createAlert(
    product: Product,
    severity: AlertSeverity,
    type: AlertType,
    message: string
  ): void {
    // Check if similar active alert already exists
    const existingAlert = alertStore.find(
      a => a.productId === product.id &&
           a.type === type &&
           !a.resolved
    );

    if (existingAlert.length > 0) {
      return; // Alert already exists
    }

    // Get AI recommendation for this product
    const aiRecommendation = getProductRecommendation(
      product.id,
      productStore.getAll(),
      eventStore.getAll(),
      alertStore.getAll()
    );

    // Create new alert with AI recommendation
    const alert: Alert = {
      id: uuidv4(),
      productId: product.id,
      severity,
      type,
      message,
      aiRecommendation: aiRecommendation ? aiRecommendation.recommendation : undefined,
      resolved: false,
      timestamp: new Date(),
    };

    alertStore.create(alert);
    console.log(`🚨 Alert created: ${type} for ${product.name}`);

    // Broadcast alert to all connected clients
    broadcastAlert(alert);
  }

  /**
   * Auto-resolve alerts when conditions no longer apply
   */
  private autoResolveAlerts(product: Product): void {
    const activeAlerts = alertStore.getByProduct(product.id).filter(a => !a.resolved);

    activeAlerts.forEach(alert => {
      let shouldResolve = false;

      switch (alert.type) {
        case 'CRITICAL_LOW_STOCK':
          shouldResolve = product.currentStock >= 10;
          break;
        case 'LOW_STOCK':
        case 'REORDER_NEEDED':
          shouldResolve = product.currentStock >= product.reorderPoint;
          break;
        case 'OVERSTOCK':
          shouldResolve = product.currentStock <= product.maxCapacity * 0.9;
          break;
      }

      if (shouldResolve) {
        alertStore.resolve(alert.id);
        console.log(`✅ Alert auto-resolved: ${alert.type} for ${product.name}`);

        // Broadcast alert resolution
        broadcastAlertResolution(alert.id);
      }
    });
  }

  /**
   * Manually resolve an alert
   */
  resolveAlert(alertId: string): Alert | undefined {
    const resolved = alertStore.resolve(alertId);
    if (resolved) {
      console.log(`✅ Alert manually resolved: ${alertId}`);

      // Broadcast alert resolution
      broadcastAlertResolution(alertId);
    }
    return resolved;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return alertStore.getActive();
  }

  /**
   * Get alerts for a specific product
   */
  getProductAlerts(productId: string): Alert[] {
    return alertStore.getByProduct(productId);
  }
}

// Export singleton instance
export const eventHandler = new EventHandler();
