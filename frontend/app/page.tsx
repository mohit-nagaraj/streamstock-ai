'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, AlertTriangle, Activity, DollarSign } from 'lucide-react';

// Types
interface Metrics {
  totalProducts: number;
  totalStockValue: number;
  activeAlerts: number;
  criticalAlerts: number;
  todayTransactions: number;
  lowStockProducts: number;
  criticalStockProducts: number;
  averageStockLevel: number;
}

interface Event {
  id: string;
  type: 'SALE' | 'RESTOCK' | 'RETURN' | 'ALERT';
  productId: string;
  quantity: number;
  warehouse: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AlertType {
  id: string;
  productId: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  aiRecommendation?: string;
  resolved: boolean;
  timestamp: string;
}

interface Product {
  id: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  maxCapacity: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      // Fetch metrics
      const metricsRes = await fetch('/api/metrics');
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setMetrics(metricsData.data);
      }

      // Fetch recent events
      const eventsRes = await fetch('/api/events?limit=10');
      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        setEvents(eventsData.data);
      }

      // Fetch active alerts
      const alertsRes = await fetch('/api/alerts?active=true');
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.data.slice(0, 5)); // Show top 5 alerts
      }

      // Fetch products for chart
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      if (productsData.success) {
        setProducts(productsData.data.slice(0, 8)); // Show top 8 products
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchDashboardData, 3000);

    return () => clearInterval(interval);
  }, []);

  // Get event icon and color
  const getEventBadge = (type: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      SALE: { variant: 'destructive', label: '📉 Sale' },
      RESTOCK: { variant: 'default', label: '📦 Restock' },
      RETURN: { variant: 'secondary', label: '↩️ Return' },
      ALERT: { variant: 'outline', label: '🚨 Alert' },
    };
    const config = variants[type] || { variant: 'outline', label: type };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Get alert severity badge
  const getAlertBadge = (severity: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      critical: { variant: 'destructive', label: 'Critical' },
      warning: { variant: 'outline', label: 'Warning' },
      info: { variant: 'secondary', label: 'Info' },
    };
    const config = variants[severity] || { variant: 'outline', label: severity };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Prepare chart data
  const chartData = products.map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    currentStock: p.currentStock,
    reorderPoint: p.reorderPoint,
    capacity: p.maxCapacity,
  }));

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Real-time inventory overview and insights
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Products</CardDescription>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg stock: {metrics?.averageStockLevel.toFixed(0) || 0} units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Stock Value</CardDescription>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((metrics?.totalStockValue || 0) / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Today's Activity</CardDescription>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.todayTransactions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Transactions today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Active Alerts</CardDescription>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.activeAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.criticalAlerts || 0} critical
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical Stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-red-600">
                {metrics?.criticalStockProducts || 0}
              </div>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Products at 0 stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low Stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-orange-600">
                {metrics?.lowStockProducts || 0}
              </div>
              <TrendingDown className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Below reorder point
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Healthy Stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-green-600">
                {(metrics?.totalProducts || 0) - (metrics?.lowStockProducts || 0) - (metrics?.criticalStockProducts || 0)}
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Adequate inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Levels Overview</CardTitle>
            <CardDescription>Current stock vs capacity for top products</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="currentStock" fill="#3b82f6" name="Current Stock" />
                <Bar dataKey="reorderPoint" fill="#f59e0b" name="Reorder Point" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Events Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Live Event Feed</CardTitle>
            <CardDescription>Recent inventory transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent events
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getEventBadge(event.type)}
                        <span className="text-sm font-medium">{event.productId}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.quantity} units • {event.warehouse}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>Critical inventory notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active alerts
              </p>
            ) : (
              alerts.map((alert) => (
                <Alert key={alert.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getAlertBadge(alert.severity)}
                          <span className="font-semibold text-sm">{alert.type.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                        {alert.aiRecommendation && (
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 {alert.aiRecommendation}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
