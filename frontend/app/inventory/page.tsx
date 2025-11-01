'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
