'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Package,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Save,
  RefreshCw,
  DollarSign,
  Warehouse,
  AlertTriangle,
  Activity,
  Sparkles,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  maxCapacity: number;
  unitPrice: number;
  warehouse: string;
  lastRestocked?: string;
  createdAt?: string;
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

interface Forecast {
  productId: string;
  predictions: Array<{
    date: string;
    predictedStock: number;
    confidence: number;
  }>;
  averageDailySales: number;
  daysUntilStockout: number;
}

interface Recommendation {
  productId: string;
  productName: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  suggestedQuantity: number;
  estimatedCost: number;
  confidence: number;
  timestamp: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unitPrice: 0,
    reorderPoint: 0,
    maxCapacity: 0,
    currentStock: 0,
  });

  // Quick action state
  const [quickActionAmount, setQuickActionAmount] = useState(10);

  // Fetch all data
  const fetchData = async () => {
    try {
      const [productRes, eventsRes, forecastRes, recommendationRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch(`/api/events?productId=${productId}&limit=50`),
        fetch(`/api/forecast?productId=${productId}`),
        fetch(`/api/recommendations?productId=${productId}`),
      ]);

      const productData = await productRes.json();
      const eventsData = await eventsRes.json();
      const forecastData = await forecastRes.json();
      const recommendationData = await recommendationRes.json();

      if (productData.success) {
        setProduct(productData.data);
        setFormData({
          name: productData.data.name,
          unitPrice: productData.data.unitPrice,
          reorderPoint: productData.data.reorderPoint,
          maxCapacity: productData.data.maxCapacity,
          currentStock: productData.data.currentStock,
        });
      }

      if (eventsData.success) {
        setEvents(eventsData.data);
      }

      if (forecastData.success) {
        setForecast(forecastData.data);
      }

      if (recommendationData.success) {
        setRecommendation(recommendationData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [productId]);

  // Handle form save
  const handleSave = async () => {
    if (!product) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchData();
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  // Quick actions
  const handleQuickAction = async (type: 'SALE' | 'RESTOCK' | 'RETURN') => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          productId,
          quantity: quickActionAmount,
        }),
      });

      if (response.ok) {
        await fetchData();
        setQuickActionAmount(10);
      }
    } catch (error) {
      console.error('Error executing quick action:', error);
    }
  };

  // Get stock status
  const getStockStatus = () => {
    if (!product) return { label: 'Unknown', color: 'gray' };

    const stockPercentage = (product.currentStock / product.maxCapacity) * 100;

    if (product.currentStock === 0) {
      return { label: 'Out of Stock', color: 'red' };
    } else if (product.currentStock < 10) {
      return { label: 'Critical', color: 'red' };
    } else if (product.currentStock <= product.reorderPoint) {
      return { label: 'Low Stock', color: 'orange' };
    } else if (stockPercentage > 90) {
      return { label: 'Overstocked', color: 'purple' };
    }
    return { label: 'Normal', color: 'green' };
  };

  // Get chart data
  const getChartData = () => {
    if (!forecast || !forecast.predictions || !Array.isArray(forecast.predictions)) return [];

    return forecast.predictions.map((pred) => ({
      date: new Date(pred.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      predicted: Math.round(pred.predictedStock),
      confidence: Math.round(pred.confidence * 100),
    }));
  };

  // Calculate event statistics
  const getEventStats = () => {
    const sales = events.filter((e) => e.type === 'SALE');
    const restocks = events.filter((e) => e.type === 'RESTOCK');
    const returns = events.filter((e) => e.type === 'RETURN');

    const totalSales = sales.reduce((sum, e) => sum + e.quantity, 0);
    const totalRestocks = restocks.reduce((sum, e) => sum + e.quantity, 0);
    const totalReturns = returns.reduce((sum, e) => sum + e.quantity, 0);

    return {
      sales: sales.length,
      restocks: restocks.length,
      returns: returns.length,
      totalSales,
      totalRestocks,
      totalReturns,
    };
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Product not found</p>
            <Button onClick={() => router.push('/inventory')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = getStockStatus();
  const eventStats = getEventStats();
  const chartData = getChartData();

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/inventory')} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground mt-1">
              {product.sku} • {product.category} • {product.warehouse}
            </p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{product.currentStock}</div>
              <Badge
                variant={status.color === 'red' ? 'destructive' : 'secondary'}
                className="gap-1"
              >
                {status.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              of {product.maxCapacity} max capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${(product.currentStock * product.unitPrice).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ${product.unitPrice.toFixed(2)} per unit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reorder Point</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{product.reorderPoint}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {product.currentStock <= product.reorderPoint
                ? 'Below threshold'
                : 'Above threshold'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Days Until Stockout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {forecast?.daysUntilStockout !== undefined
                ? forecast.daysUntilStockout === -1
                  ? '∞'
                  : forecast.daysUntilStockout
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {forecast?.averageDailySales
                ? `${forecast.averageDailySales.toFixed(1)} units/day`
                : 'No sales data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendation */}
      {recommendation && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        recommendation.priority === 'critical'
                          ? 'destructive'
                          : recommendation.priority === 'high'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {recommendation.priority.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(recommendation.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="font-semibold text-lg">{recommendation.action}</p>
                  <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      <span className="text-muted-foreground">Suggested: </span>
                      <span className="font-semibold">
                        {recommendation.suggestedQuantity} units
                      </span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Cost: </span>
                      <span className="font-semibold">
                        ${recommendation.estimatedCost?.toLocaleString() ?? 'N/A'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Details & Edit */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Product Details</CardTitle>
              {!editMode ? (
                <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setEditMode(false);
                      setFormData({
                        name: product.name,
                        unitPrice: product.unitPrice,
                        reorderPoint: product.reorderPoint,
                        maxCapacity: product.maxCapacity,
                        currentStock: product.currentStock,
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {editMode ? (
                <>
                  <div>
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unitPrice">Unit Price ($)</Label>
                      <Input
                        id="unitPrice"
                        type="number"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="currentStock">Current Stock</Label>
                      <Input
                        id="currentStock"
                        type="number"
                        value={formData.currentStock}
                        onChange={(e) =>
                          setFormData({ ...formData, currentStock: parseInt(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reorderPoint">Reorder Point</Label>
                      <Input
                        id="reorderPoint"
                        type="number"
                        value={formData.reorderPoint}
                        onChange={(e) =>
                          setFormData({ ...formData, reorderPoint: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxCapacity">Max Capacity</Label>
                      <Input
                        id="maxCapacity"
                        type="number"
                        value={formData.maxCapacity}
                        onChange={(e) =>
                          setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Product ID:</span>
                    <p className="font-mono font-semibold">{product.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SKU:</span>
                    <p className="font-semibold">{product.sku}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-semibold">{product.category}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Warehouse:</span>
                    <p className="font-semibold">{product.warehouse}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit Price:</span>
                    <p className="font-semibold">${product.unitPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stock Level:</span>
                    <p className="font-semibold">
                      {product.currentStock} / {product.maxCapacity}
                    </p>
                  </div>
                  {product.lastRestocked && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Last Restocked:</span>
                      <p className="font-semibold">
                        {new Date(product.lastRestocked).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manually trigger inventory events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quickActionAmount}
                  onChange={(e) => setQuickActionAmount(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleQuickAction('SALE')}
                  variant="destructive"
                  className="gap-2"
                >
                  <TrendingDown className="h-4 w-4" />
                  Record Sale
                </Button>
                <Button
                  onClick={() => handleQuickAction('RESTOCK')}
                  variant="default"
                  className="gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Restock
                </Button>
                <Button
                  onClick={() => handleQuickAction('RETURN')}
                  variant="secondary"
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Return
                </Button>
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-semibold">Event Statistics (Last 50 events)</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sales:</span>
                    <p className="font-bold text-red-600">
                      {eventStats.sales} ({eventStats.totalSales} units)
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Restocks:</span>
                    <p className="font-bold text-blue-600">
                      {eventStats.restocks} ({eventStats.totalRestocks} units)
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Returns:</span>
                    <p className="font-bold text-green-600">
                      {eventStats.returns} ({eventStats.totalReturns} units)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      {forecast && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>7-Day Stock Forecast</CardTitle>
            <CardDescription>AI-powered predictions using Simple Moving Average</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="predicted"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Predicted Stock"
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="confidence"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Confidence %"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Last 50 events for this product</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No events recorded</p>
              <p className="text-sm text-muted-foreground">
                Use quick actions above to create events
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        event.type === 'SALE'
                          ? 'destructive'
                          : event.type === 'RESTOCK'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {event.type}
                    </Badge>
                    <span className="font-semibold">{event.quantity} units</span>
                    <span className="text-sm text-muted-foreground">{event.warehouse}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
