'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Download, Lightbulb, Package, Warehouse } from 'lucide-react';

// Types
interface Product {
  id: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  maxCapacity: number;
  warehouse: string;
  category: string;
  unitPrice: number;
}

interface Forecast {
  productId: string;
  productName: string;
  predictions: Array<{
    date: string;
    predictedStock: number;
    confidence: number;
  }>;
  averageDailySales: number;
  confidence: number;
}

interface AIRecommendation {
  productId: string;
  productName: string;
  recommendation: string;
  reasoning: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedDaysUntilStockout: number;
  suggestedReorderQuantity: number;
  confidence: number;
}

interface Event {
  id: string;
  type: 'SALE' | 'RESTOCK' | 'RETURN';
  productId: string;
  quantity: number;
  warehouse: string;
  timestamp: string;
}

export default function AnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Fetch all analytics data
  const fetchAnalyticsData = async () => {
    try {
      // Fetch products
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      if (productsData.success) {
        setProducts(productsData.data);
      } else {
        console.error('Failed to fetch products:', productsData.error);
      }

      // Fetch forecasts
      const forecastsRes = await fetch('/api/forecast?days=7');
      const forecastsData = await forecastsRes.json();
      if (forecastsData.success) {
        setForecasts(forecastsData.data);
      } else {
        console.error('Failed to fetch forecasts:', forecastsData.error);
      }

      // Fetch AI recommendations
      try {
        const recommendationsRes = await fetch('/api/recommendations');
        const recommendationsData = await recommendationsRes.json();
        if (recommendationsData.success) {
          setRecommendations(recommendationsData.data);
        } else {
          console.error('Failed to fetch recommendations:', recommendationsData.error);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations([]);
      }

      // Fetch events for performance analysis
      const eventsRes = await fetch('/api/events?limit=1000');
      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        setEvents(eventsData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchAnalyticsData, 10000);

    return () => clearInterval(interval);
  }, []);

  // Calculate warehouse distribution
  const getWarehouseDistribution = () => {
    const warehouseData: Record<string, { count: number; totalValue: number }> = {};

    products.forEach((product) => {
      if (!warehouseData[product.warehouse]) {
        warehouseData[product.warehouse] = { count: 0, totalValue: 0 };
      }
      warehouseData[product.warehouse].count += 1;
      warehouseData[product.warehouse].totalValue += product.currentStock * product.unitPrice;
    });

    return Object.entries(warehouseData).map(([name, data]) => ({
      name,
      count: data.count,
      value: data.totalValue,
    }));
  };

  // Calculate category distribution
  const getCategoryDistribution = () => {
    const categoryData: Record<string, number> = {};

    products.forEach((product) => {
      categoryData[product.category] = (categoryData[product.category] || 0) + 1;
    });

    return Object.entries(categoryData).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Calculate product performance metrics
  const getProductPerformance = () => {
    // Calculate sales velocity for each product
    const performanceData = products.map((product) => {
      const productEvents = events.filter((e) => e.productId === product.id && e.type === 'SALE');
      const totalSales = productEvents.reduce((sum, e) => sum + e.quantity, 0);
      const salesVelocity = totalSales / 30; // Average daily sales (last 30 days)

      // Calculate turnover rate
      const turnoverRate = product.maxCapacity > 0 ? (totalSales / product.maxCapacity) * 100 : 0;

      // Stock health percentage
      const stockHealth = (product.currentStock / product.maxCapacity) * 100;

      return {
        name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
        salesVelocity: parseFloat(salesVelocity.toFixed(2)),
        turnoverRate: parseFloat(turnoverRate.toFixed(2)),
        stockHealth: parseFloat(stockHealth.toFixed(2)),
      };
    });

    // Sort by sales velocity and get top 10
    return performanceData.sort((a, b) => b.salesVelocity - a.salesVelocity).slice(0, 10);
  };

  // Get forecast chart data for selected product
  const getForecastChartData = () => {
    if (!selectedProduct) {
      // Show aggregate forecast for all products
      return [];
    }

    const forecast = forecasts.find((f) => f.productId === selectedProduct);
    if (!forecast || !forecast.predictions || !Array.isArray(forecast.predictions)) return [];

    return forecast.predictions.map((pred) => ({
      date: new Date(pred.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      predictedStock: pred.predictedStock,
      confidence: pred.confidence * 100,
    }));
  };

  // Export data to CSV
  const exportToCSV = () => {
    try {
      if (products.length === 0) {
        console.warn('No products to export');
        toast.warning('No data available to export', {
          description: 'Please wait for data to load.',
        });
        return;
      }

      const csvData: string[] = [];

      // Header
      csvData.push('Product ID,Product Name,Current Stock,Reorder Point,Max Capacity,Warehouse,Category,Unit Price,Sales Velocity,Forecast (7 days),AI Priority,AI Recommendation');

      // Data rows
      products.forEach((product) => {
        const forecast = forecasts.find((f) => f.productId === product.id);
        const recommendation = recommendations.find((r) => r.productId === product.id);
        const productEvents = events.filter((e) => e.productId === product.id && e.type === 'SALE');
        const totalSales = productEvents.reduce((sum, e) => sum + e.quantity, 0);
        const salesVelocity = (totalSales / 30).toFixed(2);

        const finalPrediction = forecast?.predictions?.[forecast.predictions.length - 1]?.predictedStock ?? 'N/A';

        csvData.push([
          product.id || '',
          `"${(product.name || '').replace(/"/g, '""')}"`, // Escape quotes properly
          product.currentStock ?? 0,
          product.reorderPoint ?? 0,
          product.maxCapacity ?? 0,
          product.warehouse || '',
          product.category || '',
          product.unitPrice ?? 0,
          salesVelocity,
          finalPrediction,
          recommendation?.priority || 'N/A',
          `"${(recommendation?.recommendation || 'N/A').replace(/"/g, '""')}"`, // Escape quotes properly
        ].join(','));
      });

      // Create blob and download
      const blob = new Blob([csvData.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log(`✅ Exported ${products.length} products to CSV`);
      toast.success('CSV exported successfully', {
        description: `Exported ${products.length} products`,
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export CSV', {
        description: 'Please try again.',
      });
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-blue-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  // Colors for charts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const warehouseDistribution = getWarehouseDistribution();
  const categoryDistribution = getCategoryDistribution();
  const productPerformance = getProductPerformance();
  const forecastChartData = getForecastChartData();

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Forecasting</h1>
          <p className="text-muted-foreground mt-2">
            Data-driven insights and predictive analytics for inventory management
          </p>
        </div>
        <Button onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Products Analyzed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {forecasts.length} forecasts generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI Recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recommendations.filter((r) => r.priority === 'critical').length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Confidence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecasts.length > 0
                ? (
                    (forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Forecast accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {events.filter((e) => e.type === 'SALE').length} sales recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Demand Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Demand Forecast (7-Day Prediction)</CardTitle>
          <CardDescription>Select a product to view detailed forecast predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <select
              className="w-full md:w-64 p-2 border rounded-md"
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(e.target.value || null)}
            >
              <option value="">Select a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {forecastChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="predictedStock"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Predicted Stock"
                  dot={{ fill: '#3b82f6' }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="confidence"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Confidence (%)"
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Select a product to view forecast chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Performance and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Products by Sales Velocity</CardTitle>
            <CardDescription>Average daily sales over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="salesVelocity" fill="#3b82f6" name="Sales Velocity (units/day)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Warehouse Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Distribution</CardTitle>
            <CardDescription>Product count and total value by warehouse</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={warehouseDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.count})`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {warehouseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {warehouseDistribution.map((warehouse, index) => (
                <div key={warehouse.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{warehouse.name}</span>
                  </div>
                  <span className="font-semibold">
                    ${(warehouse.value / 1000).toFixed(1)}K
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Category Distribution</CardTitle>
          <CardDescription>Product count by category</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10b981" name="Product Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Insights Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            AI-Powered Insights & Recommendations
          </CardTitle>
          <CardDescription>
            Intelligent reorder recommendations based on predictive analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recommendations at this time. All products are adequately stocked.
              </p>
            ) : (
              recommendations.slice(0, 10).map((rec) => (
                <Alert key={rec.productId}>
                  <AlertDescription>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={
                              rec.priority === 'critical' || rec.priority === 'high'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <span className="font-semibold">{rec.productName}</span>
                          {rec.estimatedDaysUntilStockout < 7 && (
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {rec.estimatedDaysUntilStockout} days until stockout
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1">{rec.recommendation}</p>
                        <p className="text-xs text-muted-foreground mb-2">{rec.reasoning}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <span>
                            <strong>Suggested Reorder:</strong> {rec.suggestedReorderQuantity} units
                          </span>
                          <span>
                            <strong>Confidence:</strong> {(rec.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
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
