import express, { Request, Response } from 'express';
import { productStore, alertStore, eventStore } from '../stores/InMemoryStore';
import { sendEvent } from '../kafka/producer';
import { Event } from '../models/types';
import { generateForecasts, calculateSMAForecast } from '../services/Forecasting';

const router = express.Router();

// Products API
router.get('/products', (req: Request, res: Response) => {
  try {
    const { warehouse, category, status } = req.query;

    let products = productStore.getAll();

    // Apply filters
    if (warehouse) {
      products = products.filter(p => p.warehouse === warehouse);
    }
    if (category) {
      products = products.filter(p => p.category === category);
    }
    if (status === 'low') {
      products = productStore.getLowStock();
    } else if (status === 'critical') {
      products = productStore.getCriticalStock();
    }

    res.json({
      success: true,
      data: products,
      count: products.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
    });
  }
});

router.get('/products/:id', (req: Request, res: Response) => {
  try {
    const product = productStore.get(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
    });
  }
});

router.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const updates = req.body;
    const oldProduct = productStore.get(productId);

    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    const product = productStore.update(productId, updates);

    // If stock changed, publish event to Kafka
    if (updates.currentStock !== undefined && updates.currentStock !== oldProduct.currentStock) {
      const stockChange = updates.currentStock - oldProduct.currentStock;
      const eventType = stockChange > 0 ? 'RESTOCK' : 'SALE';

      const event: Event = {
        id: `EVT-API-${Date.now()}`,
        type: eventType,
        productId: productId,
        quantity: Math.abs(stockChange),
        warehouse: product!.warehouse,
        timestamp: new Date(),
        metadata: { source: 'api', manual: true },
      };

      // Publish to Kafka (fire and forget for API responsiveness)
      sendEvent(event).catch(err => {
        console.error('Failed to publish event to Kafka:', err);
      });

      console.log(`📤 API triggered event: ${eventType} - ${productId} (${stockChange > 0 ? '+' : ''}${stockChange} units)`);
    }

    res.json({
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
    });
  }
});

// Events API
router.get('/events', (req: Request, res: Response) => {
  try {
    const { type, productId, warehouse, limit = '100' } = req.query;

    let events = eventStore.getAll();

    // Apply filters
    if (type) {
      events = eventStore.getByType(type as any);
    }
    if (productId) {
      events = eventStore.getByProduct(productId as string);
    }
    if (warehouse) {
      events = eventStore.getByWarehouse(warehouse as string);
    }

    // Get recent events and serialize properly
    const recentEvents = events
      .sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      })
      .slice(0, parseInt(limit as string))
      .map(e => ({
        ...e,
        timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
      }));

    res.json({
      success: true,
      data: recentEvents,
      count: recentEvents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    });
  }
});

// POST endpoint to manually create events (for testing Kafka integration)
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { type, productId, quantity, warehouse } = req.body;

    // Validate required fields
    if (!type || !productId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, productId, quantity',
      });
    }

    // Get product to determine warehouse if not provided
    const product = productStore.get(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Create event
    const event: Event = {
      id: `EVT-API-${Date.now()}`,
      type: type,
      productId: productId,
      quantity: quantity,
      warehouse: warehouse || product.warehouse,
      timestamp: new Date(),
      metadata: { source: 'api', manual: true },
    };

    // Publish to Kafka
    await sendEvent(event);

    console.log(`📤 API created event: ${type} - ${productId} (${quantity} units)`);

    res.json({
      success: true,
      data: event,
      message: 'Event published to Kafka successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
    });
  }
});

// Alerts API
router.get('/alerts', (req: Request, res: Response) => {
  try {
    const { severity, productId, active } = req.query;

    let alerts = alertStore.getAll();

    // Apply filters
    if (active === 'true') {
      alerts = alertStore.getActive();
    }
    if (severity) {
      alerts = alertStore.getBySeverity(severity as any);
    }
    if (productId) {
      alerts = alertStore.getByProduct(productId as string);
    }

    // Sort by timestamp (newest first)
    alerts = alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});

router.post('/alerts/:id/resolve', (req: Request, res: Response) => {
  try {
    const alert = alertStore.resolve(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      data: alert,
      message: 'Alert resolved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
    });
  }
});

// Metrics API
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const products = productStore.getAll();
    const alerts = alertStore.getActive();
    const criticalAlerts = alertStore.getCritical();
    const lowStockProducts = productStore.getLowStock();
    const criticalStockProducts = productStore.getCriticalStock();

    // Get today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = eventStore.getByTimeRange(today, new Date());

    const metrics = {
      totalProducts: products.length,
      totalStockValue: productStore.getTotalValue(),
      activeAlerts: alerts.length,
      criticalAlerts: criticalAlerts.length,
      todayTransactions: todayEvents.length,
      lowStockProducts: lowStockProducts.length,
      criticalStockProducts: criticalStockProducts.length,
      averageStockLevel: products.reduce((sum, p) => sum + p.currentStock, 0) / products.length,
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
    });
  }
});

// Forecast API
router.get('/forecast', (req: Request, res: Response) => {
  try {
    const { productId, days = '7' } = req.query;
    const forecastDays = parseInt(days as string);

    const products = productStore.getAll();
    const events = eventStore.getAll();

    // Generate forecast for specific product or all products
    if (productId) {
      const product = productStore.get(productId as string);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      const forecast = calculateSMAForecast(product, events, forecastDays);

      res.json({
        success: true,
        data: forecast,
        timestamp: new Date().toISOString(),
      });
    } else {
      const forecasts = generateForecasts(products, events, forecastDays);

      res.json({
        success: true,
        data: forecasts,
        count: forecasts.length,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate forecast',
    });
  }
});

export default router;
