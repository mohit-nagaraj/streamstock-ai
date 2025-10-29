/**
 * Core data models for StreamStock AI
 * Event-driven inventory management system
 */

// ============================================================================
// Product Entity
// ============================================================================
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  currentStock: number;
  reorderPoint: number;
  maxCapacity: number;
  unitPrice: number;
  predictedStock7d: number;
  lastUpdated: Date;
}

// ============================================================================
// Event Entity
// ============================================================================
export type EventType = 'SALE' | 'RESTOCK' | 'RETURN' | 'ALERT';

export interface Event {
  id: string;
  type: EventType;
  productId: string;
  quantity: number;
  warehouse: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// Alert Entity
// ============================================================================
export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertType =
  | 'LOW_STOCK'
  | 'CRITICAL_LOW_STOCK'
  | 'OVERSTOCK'
  | 'RAPID_DEPLETION'
  | 'AI_RECOMMENDATION'
  | 'REORDER_NEEDED';

export interface Alert {
  id: string;
  productId: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  aiRecommendation?: string;
  resolved: boolean;
  timestamp: Date;
  resolvedAt?: Date;
}

// ============================================================================
// Historical Data for Forecasting
// ============================================================================
export interface HistoricalDataPoint {
  productId: string;
  date: Date;
  stockLevel: number;
  salesCount: number;
  restockCount: number;
}

// ============================================================================
// Forecast Result
// ============================================================================
export interface ForecastResult {
  productId: string;
  currentStock: number;
  predictedStock7d: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  generatedAt: Date;
}

// ============================================================================
// Warehouse Entity
// ============================================================================
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentUtilization: number;
}

// ============================================================================
// API Response Types
// ============================================================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// ============================================================================
// Dashboard Metrics
// ============================================================================
export interface DashboardMetrics {
  totalProducts: number;
  totalStockValue: number;
  activeAlerts: number;
  todayTransactions: number;
  lowStockProducts: number;
  criticalStockProducts: number;
}
