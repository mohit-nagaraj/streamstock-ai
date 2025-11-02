'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  TrendingDown,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
interface Event {
  id: string;
  type: 'SALE' | 'RESTOCK' | 'RETURN' | 'ALERT';
  productId: string;
  quantity: number;
  warehouse: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface EventStats {
  total: number;
  sales: number;
  restocks: number;
  returns: number;
  alerts: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(50);

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/events?limit=${limit}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchEvents, 3000);

    return () => clearInterval(interval);
  }, [limit]);

  // Calculate event statistics
  const getEventStats = (): EventStats => {
    return {
      total: events.length,
      sales: events.filter((e) => e.type === 'SALE').length,
      restocks: events.filter((e) => e.type === 'RESTOCK').length,
      returns: events.filter((e) => e.type === 'RETURN').length,
      alerts: events.filter((e) => e.type === 'ALERT').length,
    };
  };

  // Get chart data
  const getChartData = () => {
    const stats = getEventStats();
    return [
      { name: 'Sales', count: stats.sales, fill: '#ef4444' },
      { name: 'Restocks', count: stats.restocks, fill: '#3b82f6' },
      { name: 'Returns', count: stats.returns, fill: '#10b981' },
      { name: 'Alerts', count: stats.alerts, fill: '#f59e0b' },
    ];
  };

  // Get unique warehouses for filter
  const getWarehouses = () => {
    const warehouses = new Set(events.map((e) => e.warehouse));
    return Array.from(warehouses);
  };

  // Filter events
  const getFilteredEvents = () => {
    let filtered = events;

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.type === typeFilter);
    }

    // Warehouse filter
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter((e) => e.warehouse === warehouseFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.id.toLowerCase().includes(query) ||
          e.productId.toLowerCase().includes(query) ||
          e.warehouse.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Toggle event expansion
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Get event type badge
  const getEventBadge = (type: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: any }
    > = {
      SALE: { variant: 'destructive', label: 'Sale', icon: TrendingDown },
      RESTOCK: { variant: 'default', label: 'Restock', icon: Package },
      RETURN: { variant: 'secondary', label: 'Return', icon: RotateCcw },
      ALERT: { variant: 'outline', label: 'Alert', icon: Activity },
    };
    const config = variants[type] || { variant: 'outline', label: type, icon: Activity };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = getEventStats();
  const filteredEvents = getFilteredEvents();
  const warehouses = getWarehouses();
  const chartData = getChartData();

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Logs</h1>
          <p className="text-muted-foreground mt-2">
            Real-time Kafka event stream with filtering and statistics
          </p>
        </div>
        <Button onClick={fetchEvents} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All event types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.sales}</div>
            <p className="text-xs text-muted-foreground mt-1">Stock decreases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Restocks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.restocks}</div>
            <p className="text-xs text-muted-foreground mt-1">Stock increases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.returns}</div>
            <p className="text-xs text-muted-foreground mt-1">Items returned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.alerts}</div>
            <p className="text-xs text-muted-foreground mt-1">System alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Event Distribution</CardTitle>
          <CardDescription>Count of events by type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Type Filter */}
            <select
              className="w-full p-2 border rounded-md"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="SALE">Sales</option>
              <option value="RESTOCK">Restocks</option>
              <option value="RETURN">Returns</option>
              <option value="ALERT">Alerts</option>
            </select>

            {/* Warehouse Filter */}
            <select
              className="w-full p-2 border rounded-md"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>

            {/* Limit */}
            <select
              className="w-full p-2 border rounded-md"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
            >
              <option value="50">Last 50 events</option>
              <option value="100">Last 100 events</option>
              <option value="200">Last 200 events</option>
              <option value="500">Last 500 events</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Event Stream</CardTitle>
          <CardDescription>
            Showing {filteredEvents.length} of {stats.total} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No events found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or wait for new events to arrive
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const isExpanded = expandedEvents.has(event.id);

                return (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getEventBadge(event.type)}
                          <Badge variant="outline" className="font-mono text-xs">
                            {event.productId}
                          </Badge>
                          <Badge variant="secondary">{event.warehouse}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {event.quantity} units
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(event.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span className="font-mono">{event.id}</span>
                        </div>

                        {/* Expanded JSON View */}
                        {isExpanded && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-xs font-semibold mb-2">Event Payload (JSON)</p>
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(
                                {
                                  id: event.id,
                                  type: event.type,
                                  productId: event.productId,
                                  quantity: event.quantity,
                                  warehouse: event.warehouse,
                                  timestamp: event.timestamp,
                                  metadata: event.metadata || {},
                                },
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleEventExpansion(event.id)}
                        className="gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            JSON
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
