'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Package,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Types
interface AlertType {
  id: string;
  productId: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  aiRecommendation?: string;
  resolved: boolean;
  timestamp: string;
  resolvedAt?: string;
}

interface Product {
  id: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  maxCapacity: number;
}

interface AlertStats {
  total: number;
  active: number;
  critical: number;
  resolved: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [resolvingAlerts, setResolvingAlerts] = useState<Set<string>>(new Set());
  const [restockingProducts, setRestockingProducts] = useState<Set<string>>(new Set());

  // Fetch alerts and products
  const fetchData = async () => {
    try {
      // Fetch all alerts
      const alertsRes = await fetch('/api/alerts');
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.data);
      }

      // Fetch products for additional context
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      if (productsData.success) {
        setProducts(productsData.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, []);

  // Calculate alert statistics
  const getAlertStats = (): AlertStats => {
    return {
      total: alerts.length,
      active: alerts.filter((a) => !a.resolved).length,
      critical: alerts.filter((a) => a.severity === 'critical' && !a.resolved).length,
      resolved: alerts.filter((a) => a.resolved).length,
    };
  };

  // Filter alerts based on current filters
  const getFilteredAlerts = () => {
    let filtered = alerts;

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((a) => !a.resolved);
    } else if (statusFilter === 'resolved') {
      filtered = filtered.filter((a) => a.resolved);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter((a) => a.severity === severityFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.productId.toLowerCase().includes(query) ||
          a.message.toLowerCase().includes(query) ||
          a.type.toLowerCase().includes(query)
      );
    }

    // Sort by timestamp (newest first)
    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  // Get unique alert types for filter
  const getAlertTypes = () => {
    const types = new Set(alerts.map((a) => a.type));
    return Array.from(types);
  };

  // Get product name by ID
  const getProductName = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : productId;
  };

  // Get product by ID
  const getProduct = (productId: string) => {
    return products.find((p) => p.id === productId);
  };

  // Resolve alert
  const handleResolveAlert = async (alertId: string) => {
    setResolvingAlerts((prev) => new Set(prev).add(alertId));

    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      } else {
        console.error('Failed to resolve alert');
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setResolvingAlerts((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  // Restock product
  const handleRestock = async (productId: string) => {
    setRestockingProducts((prev) => new Set(prev).add(productId));

    try {
      const product = getProduct(productId);
      if (!product) return;

      const restockAmount = product.maxCapacity - product.currentStock;
      const newStock = product.currentStock + restockAmount;

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: newStock }),
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      } else {
        console.error('Failed to restock product');
      }
    } catch (error) {
      console.error('Error restocking product:', error);
    } finally {
      setRestockingProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  // Toggle alert expansion
  const toggleAlertExpansion = (alertId: string) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; color: string }
    > = {
      critical: { variant: 'destructive', label: 'Critical', color: 'text-red-600' },
      warning: { variant: 'outline', label: 'Warning', color: 'text-orange-600' },
      info: { variant: 'secondary', label: 'Info', color: 'text-blue-600' },
    };
    const config = variants[severity] || { variant: 'outline', label: severity, color: 'text-gray-600' };
    return (
      <Badge variant={config.variant} className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get alert type badge
  const getTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" className="gap-1">
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const stats = getAlertStats();
  const filteredAlerts = getFilteredAlerts();
  const alertTypes = getAlertTypes();

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts & Actions</h1>
          <p className="text-muted-foreground mt-2">
            Real-time alert stream with filters and resolution actions
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">Urgent action needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Status Filter */}
            <select
              className="w-full p-2 border rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="resolved">Resolved Only</option>
            </select>

            {/* Severity Filter */}
            <select
              className="w-full p-2 border rounded-md"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            {/* Type Filter */}
            <select
              className="w-full p-2 border rounded-md"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {alertTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Stream</CardTitle>
          <CardDescription>
            {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No alerts found</p>
                <p className="text-sm text-muted-foreground">
                  {statusFilter === 'active'
                    ? 'All alerts have been resolved. Great job!'
                    : 'Try adjusting your filters to see more results.'}
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isExpanded = expandedAlerts.has(alert.id);
                const isResolving = resolvingAlerts.has(alert.id);
                const isRestocking = restockingProducts.has(alert.productId);
                const product = getProduct(alert.productId);

                return (
                  <Alert
                    key={alert.id}
                    className={alert.resolved ? 'opacity-60 bg-green-50' : ''}
                  >
                    <AlertDescription>
                      <div className="space-y-3">
                        {/* Alert Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getSeverityBadge(alert.severity)}
                              {getTypeBadge(alert.type)}
                              {alert.resolved && (
                                <Badge variant="default" className="gap-1 bg-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  Resolved
                                </Badge>
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-sm mb-1">
                                {getProductName(alert.productId)}
                              </p>
                              <p className="text-sm">{alert.message}</p>
                            </div>

                            {alert.aiRecommendation && (
                              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                                  <TrendingDown className="h-3 w-3" />
                                  AI Recommendation
                                </p>
                                <p className="text-xs text-blue-800">{alert.aiRecommendation}</p>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(alert.timestamp).toLocaleString()}
                              </span>
                              {alert.resolved && alert.resolvedAt && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2">
                            {!alert.resolved && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolveAlert(alert.id)}
                                  disabled={isResolving}
                                  className="gap-1 text-xs"
                                >
                                  {isResolving ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                  Resolve
                                </Button>

                                {product && product.currentStock < product.maxCapacity && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleRestock(alert.productId)}
                                    disabled={isRestocking}
                                    className="gap-1 text-xs"
                                  >
                                    {isRestocking ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Package className="h-3 w-3" />
                                    )}
                                    Restock
                                  </Button>
                                )}
                              </>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleAlertExpansion(alert.id)}
                              className="gap-1 text-xs"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  More
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t pt-3 space-y-2">
                            <p className="text-xs font-semibold">Alert Details</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Alert ID:</span>
                                <span className="ml-2 font-mono">{alert.id}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Product ID:</span>
                                <span className="ml-2 font-mono">{alert.productId}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Type:</span>
                                <span className="ml-2">{alert.type.replace(/_/g, ' ')}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Severity:</span>
                                <span className="ml-2 capitalize">{alert.severity}</span>
                              </div>
                            </div>

                            {product && (
                              <>
                                <p className="text-xs font-semibold mt-3">Product Status</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Current Stock:</span>
                                    <span className="ml-2 font-semibold">{product.currentStock}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Reorder Point:</span>
                                    <span className="ml-2 font-semibold">{product.reorderPoint}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Max Capacity:</span>
                                    <span className="ml-2 font-semibold">{product.maxCapacity}</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
