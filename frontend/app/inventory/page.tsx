'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingDown, TrendingUp, RotateCcw, Zap, Package } from 'lucide-react';

// Types
interface Product {
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
  lastUpdated: string;
}

interface ForecastResult {
  productId: string;
  productName: string;
  currentStock: number;
  predictedStock7d: number;
  predictedDemand7d: number;
  reorderRecommended: boolean;
  confidence: number;
  forecastDate: string;
}

type StockStatus = 'critical' | 'low' | 'normal' | 'overstocked';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [forecasts, setForecasts] = useState<Map<string, ForecastResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggeringAnomaly, setTriggeringAnomaly] = useState<string | null>(null);

  // Fetch products and forecasts
  const fetchData = async () => {
    try {
      // Fetch products
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();

      if (productsData.success) {
        setProducts(productsData.data);
      }

      // Fetch forecasts
      const forecastsRes = await fetch('/api/forecast');
      const forecastsData = await forecastsRes.json();

      if (forecastsData.success) {
        const forecastMap = new Map<string, ForecastResult>();
        forecastsData.data.forEach((forecast: ForecastResult) => {
          forecastMap.set(forecast.productId, forecast);
        });
        setForecasts(forecastMap);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, []);

  // Get stock status
  const getStockStatus = (product: Product): StockStatus => {
    const stockPercentage = (product.currentStock / product.maxCapacity) * 100;

    if (product.currentStock === 0) return 'critical';
    if (product.currentStock <= product.reorderPoint) return 'low';
    if (stockPercentage > 90) return 'overstocked';
    return 'normal';
  };

  // Get status badge
  const getStatusBadge = (status: StockStatus) => {
    const variants: Record<StockStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      critical: { variant: 'destructive', label: 'Critical' },
      low: { variant: 'outline', label: 'Low Stock' },
      normal: { variant: 'default', label: 'In Stock' },
      overstocked: { variant: 'secondary', label: 'Overstocked' },
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Get unique warehouses and categories
  const warehouses = ['all', ...new Set(products.map(p => p.warehouse))];
  const categories = ['all', ...new Set(products.map(p => p.category))];

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWarehouse = warehouseFilter === 'all' || product.warehouse === warehouseFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    if (!matchesSearch || !matchesWarehouse || !matchesCategory) return false;

    if (statusFilter === 'all') return true;
    const status = getStockStatus(product);
    return status === statusFilter;
  });

  // Handle restock action
  const handleRestock = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const restockAmount = product.maxCapacity - product.currentStock;
    const newStock = product.currentStock + restockAmount;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: newStock }),
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error restocking product:', error);
    }
  };

  // Handle anomaly triggers
  const triggerAnomaly = async (anomalyType: string) => {
    if (products.length === 0) {
      toast.error('No products available to trigger anomaly');
      return;
    }

    setTriggeringAnomaly(anomalyType);

    try {
      // Select a random product with sufficient stock for the scenario
      let targetProduct: Product | undefined;
      let eventType: 'SALE' | 'RESTOCK' | 'RETURN';
      let quantity: number;
      let description: string;

      switch (anomalyType) {
        case 'rapid-sale':
          // Find product with high stock for rapid sale
          targetProduct = products.find(p => p.currentStock > 50) || products[0];
          eventType = 'SALE';
          quantity = Math.min(Math.floor(targetProduct.currentStock * 0.4), 50); // 40% of stock or 50 units
          description = `Rapid sale of ${quantity} units`;
          break;

        case 'bulk-restock':
          // Find product with low stock for bulk restock
          targetProduct = products.find(p => p.currentStock < p.reorderPoint) || products[0];
          eventType = 'RESTOCK';
          quantity = Math.min(targetProduct.maxCapacity - targetProduct.currentStock, 200);
          description = `Bulk restock of ${quantity} units`;
          break;

        case 'return-flood':
          // Find product with sales history for returns
          targetProduct = products.find(p => p.currentStock < p.maxCapacity * 0.8) || products[0];
          eventType = 'RETURN';
          quantity = Math.min(30, targetProduct.maxCapacity - targetProduct.currentStock);
          description = `Return flood of ${quantity} units`;
          break;

        case 'critical-depletion':
          // Find product with moderate stock to deplete
          targetProduct = products.find(p => p.currentStock > 20) || products[0];
          eventType = 'SALE';
          quantity = Math.max(targetProduct.currentStock - 5, 1); // Reduce to 5 units
          description = `Critical depletion - ${quantity} units sold`;
          break;

        case 'multiple-sales':
          // Trigger multiple sales across different products
          const selectedProducts = products.slice(0, 3);
          for (const product of selectedProducts) {
            const saleQuantity = Math.min(Math.floor(product.currentStock * 0.2), 20);
            if (saleQuantity > 0) {
              await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'SALE',
                  productId: product.id,
                  quantity: saleQuantity,
                }),
              });
            }
          }
          toast.success(`Multiple sales triggered`, {
            description: `Sales triggered across ${selectedProducts.length} products`,
          });
          await fetchData();
          setTriggeringAnomaly(null);
          return;

        case 'reorder-trigger':
          // Find product at reorder point
          targetProduct = products.find(p => p.currentStock > p.reorderPoint) || products[0];
          eventType = 'SALE';
          quantity = Math.max(targetProduct.currentStock - targetProduct.reorderPoint + 5, 1);
          description = `Sale to trigger reorder point`;
          break;

        default:
          setTriggeringAnomaly(null);
          return;
      }

      if (targetProduct && quantity > 0) {
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: eventType,
            productId: targetProduct.id,
            quantity,
          }),
        });

        if (response.ok) {
          toast.success('Anomaly triggered successfully', {
            description: `${description} for ${targetProduct.name}`,
          });
          await fetchData();
        } else {
          let errorMessage = 'Unknown error';
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch (e) {
            errorMessage = `Server returned ${response.status}: ${response.statusText}`;
          }
          toast.error('Failed to trigger anomaly', {
            description: errorMessage,
          });
        }
      }
    } catch (error) {
      console.error('Error triggering anomaly:', error);
      toast.error('Failed to trigger anomaly', {
        description: error instanceof Error ? error.message : 'Check console for details',
      });
    } finally {
      setTriggeringAnomaly(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground mt-2">
          Real-time inventory tracking with AI-powered predictions
        </p>
      </div>

      {/* Anomaly Triggers */}
      <Card className="border-2 border-dashed border-orange-300 bg-orange-50/50 dark:bg-orange-950/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900 dark:text-orange-100">
              Trigger Inventory Anomalies
            </CardTitle>
          </div>
          <CardDescription>
            Simulate various inventory scenarios to test system alerts and AI recommendations.
            Events will be processed through Kafka and trigger real-time updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Rapid Sale */}
            <Button
              variant="destructive"
              className="h-auto flex-col items-start gap-2 p-4"
              onClick={() => triggerAnomaly('rapid-sale')}
              disabled={triggeringAnomaly !== null}
            >
              <div className="flex items-center gap-2 w-full">
                <TrendingDown className="h-5 w-5" />
                <span className="font-semibold">Rapid Sale</span>
              </div>
              <span className="text-xs text-left opacity-90">
                Sells 40% of stock to trigger rapid depletion alert
              </span>
              {triggeringAnomaly === 'rapid-sale' && (
                <span className="text-xs">Processing...</span>
              )}
            </Button>

            {/* Bulk Restock */}
            <Button
              variant="default"
              className="h-auto flex-col items-start gap-2 p-4 bg-blue-600 hover:bg-blue-700"
              onClick={() => triggerAnomaly('bulk-restock')}
              disabled={triggeringAnomaly !== null}
            >
              <div className="flex items-center gap-2 w-full">
                <TrendingUp className="h-5 w-5" />
                <span className="font-semibold">Bulk Restock</span>
              </div>
              <span className="text-xs text-left opacity-90">
                Restocks low inventory items to capacity
              </span>
              {triggeringAnomaly === 'bulk-restock' && (
                <span className="text-xs">Processing...</span>
              )}
            </Button>

            {/* Return Flood */}
            <Button
              variant="secondary"
              className="h-auto flex-col items-start gap-2 p-4"
              onClick={() => triggerAnomaly('return-flood')}
              disabled={triggeringAnomaly !== null}
            >
              <div className="flex items-center gap-2 w-full">
                <RotateCcw className="h-5 w-5" />
                <span className="font-semibold">Return Flood</span>
              </div>
              <span className="text-xs text-left opacity-90">
                Processes 30 unit returns to test overstock handling
              </span>
              {triggeringAnomaly === 'return-flood' && (
                <span className="text-xs">Processing...</span>
              )}
            </Button>

            {/* Critical Depletion */}
            <Button
              variant="destructive"
              className="h-auto flex-col items-start gap-2 p-4 bg-red-700 hover:bg-red-800"
              onClick={() => triggerAnomaly('critical-depletion')}
              disabled={triggeringAnomaly !== null}
            >
              <div className="flex items-center gap-2 w-full">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Critical Depletion</span>
              </div>
              <span className="text-xs text-left opacity-90">
                Reduces stock to &lt;10 units to trigger critical alert
              </span>
              {triggeringAnomaly === 'critical-depletion' && (
                <span className="text-xs">Processing...</span>
              )}
            </Button>

            {/* Multiple Sales */}
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-2 p-4 border-orange-300 hover:bg-orange-50"
              onClick={() => triggerAnomaly('multiple-sales')}
              disabled={triggeringAnomaly !== null}
            >
              <div className="flex items-center gap-2 w-full">
                <Package className="h-5 w-5" />
                <span className="font-semibold">Multiple Sales</span>
              </div>
              <span className="text-xs text-left opacity-90">
                Triggers sales across 3 products simultaneously
              </span>
              {triggeringAnomaly === 'multiple-sales' && (
                <span className="text-xs">Processing...</span>
              )}
            </Button>

            {/* Reorder Trigger */}
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-2 p-4 border-yellow-300 hover:bg-yellow-50"
              onClick={() => triggerAnomaly('reorder-trigger')}
              disabled={triggeringAnomaly !== null}
            >
              <div className="flex items-center gap-2 w-full">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold">Hit Reorder Point</span>
              </div>
              <span className="text-xs text-left opacity-90">
                Sells units to reach reorder point threshold
              </span>
              {triggeringAnomaly === 'reorder-trigger' && (
                <span className="text-xs">Processing...</span>
              )}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>💡 How it works:</strong> Each anomaly is processed through the Kafka event pipeline,
              triggering the AI recommendation engine and alert system. Check the{' '}
              <a href="/alerts" className="underline font-medium">Alerts</a> and{' '}
              <a href="/events" className="underline font-medium">Events</a> pages to see real-time results.
              See <span className="font-mono">docs/AI_RECOMMENDATIONS.md</span> for calculation details.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter your inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />

            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(warehouse => (
                  <SelectItem key={warehouse} value={warehouse}>
                    {warehouse === 'all' ? 'All Warehouses' : warehouse}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="normal">In Stock</SelectItem>
                <SelectItem value="overstocked">Overstocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
          <CardDescription>
            Current stock levels and AI predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Predicted (7d)</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const forecast = forecasts.get(product.id);
                  const status = getStockStatus(product);

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.warehouse}</TableCell>
                      <TableCell className="text-right">
                        <span className={status === 'critical' || status === 'low' ? 'text-red-600 font-semibold' : ''}>
                          {product.currentStock}
                        </span>
                        <span className="text-muted-foreground text-xs ml-1">
                          / {product.maxCapacity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {forecast ? (
                          <div className="space-y-1">
                            <div className={forecast.predictedStock7d < product.reorderPoint ? 'text-orange-600 font-semibold' : ''}>
                              {forecast.predictedStock7d}
                            </div>
                            {forecast.reorderRecommended && (
                              <Badge variant="outline" className="text-xs">
                                Reorder
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {forecast ? (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(forecast.confidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {status !== 'overstocked' && status !== 'normal' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleRestock(product.id)}
                            >
                              Restock
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/inventory/${product.id}`, '_self')}
                          >
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Products</CardDescription>
            <CardTitle className="text-2xl">{filteredProducts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical Stock</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {filteredProducts.filter(p => getStockStatus(p) === 'critical').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low Stock</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {filteredProducts.filter(p => getStockStatus(p) === 'low').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl">
              ${filteredProducts.reduce((sum, p) => sum + (p.currentStock * p.unitPrice), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
