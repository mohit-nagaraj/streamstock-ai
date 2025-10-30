import express, { Request, Response } from 'express';
import { productStore, alertStore, eventStore } from '../stores/InMemoryStore';

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

router.put('/products/:id', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const product = productStore.update(req.params.id, updates);

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

    // Get recent events
    events = events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: events,
      count: events.length,
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

export default router;
