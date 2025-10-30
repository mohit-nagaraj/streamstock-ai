# StreamStock AI - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Data Flow](#data-flow)
4. [Component Details](#component-details)
5. [Event-Driven Design](#event-driven-design)
6. [Data Models](#data-models)
7. [Scalability Considerations](#scalability-considerations)

## System Overview

StreamStock AI is an event-driven inventory management system built on **microservices architecture** with **Apache Kafka** as the central nervous system. The system prevents overselling and stockouts through real-time event processing and AI-powered forecasting.

### Key Design Principles
- **Event-Driven Architecture**: All state changes are events
- **Decoupled Services**: Producer and consumer independence
- **Real-Time Processing**: Sub-second alert generation
- **Scalable by Design**: Horizontal scaling supported
- **Type-Safe**: End-to-end TypeScript

## Architecture Patterns

### 1. Event Sourcing
All inventory changes are captured as immutable events:
- SALE events reduce stock
- RESTOCK events increase stock
- RETURN events adjust stock
- ALERT events trigger notifications

### 2. CQRS (Command Query Responsibility Segregation)
- **Commands**: Writes go through Kafka producers
- **Queries**: Reads from in-memory stores
- **Benefits**: Optimized read/write performance

### 3. Producer-Consumer Pattern
```
Producer (Event Generator)
    ↓ [Kafka Topics]
Consumer (Event Handler)
    ↓
Data Stores + Alerts
```

### 4. Repository Pattern
In-memory stores provide abstraction:
```typescript
class ProductStore extends InMemoryStore<Product> {
  getLowStock(): Product[]
  getCriticalStock(): Product[]
  updateStock(id: string, quantity: number): Product
}
```

## Data Flow

### Event Generation Flow
```
1. Event Generator
   ├─ Selects random product
   ├─ Determines event type (65% sales, 25% restocks, 10% returns)
   ├─ Calculates quantity
   └─ Creates Event object

2. Kafka Producer
   ├─ Routes to appropriate topic
   ├─ Partitions by product ID
   └─ Sends to Kafka cluster

3. Kafka Cluster
   ├─ Stores event in topic
   ├─ Replicates (if configured)
   └─ Makes available to consumers

4. Kafka Consumer
   ├─ Receives event from topic
   ├─ Deserializes message
   └─ Passes to Event Handler

5. Event Handler
   ├─ Updates product stock
   ├─ Checks alert conditions
   ├─ Triggers forecasting
   └─ Stores in event history
```

### Query Flow (Frontend → Backend)
```
1. Frontend Component
   ├─ React hook triggers API call
   └─ Polls every 2-3 seconds

2. Next.js API Route
   ├─ Receives HTTP request
   ├─ Queries in-memory store
   └─ Returns JSON response

3. In-Memory Store
   ├─ O(1) lookup by ID
   ├─ O(n) filtering/searching
   └─ Returns data

4. Frontend Component
   ├─ Updates React state
   ├─ Re-renders UI
   └─ Displays charts/tables
```

## Component Details

### Frontend (Next.js 14)

#### Pages
- **Dashboard (`/`)**: Real-time metrics, event feed, alerts
- **Inventory (`/inventory`)**: Product management, stock levels
- **Analytics (`/analytics`)**: Forecasting, performance charts
- **Alerts (`/alerts`)**: Alert management, resolution
- **Events (`/events`)**: Event logs, statistics

#### Key Technologies
- **App Router**: File-based routing
- **Server Components**: Default rendering mode
- **Client Components**: For interactivity
- **shadcn/ui**: Component library
- **Recharts**: Data visualization

### Backend (Node.js/TypeScript)

#### Layers

**1. API Layer** (`/api` routes)
- RESTful endpoints
- Request validation
- Response formatting
- Error handling

**2. Service Layer** (`/services`)
- **EventHandler**: Business logic for events
- Alert triggering
- Auto-resolution
- Forecasting coordination

**3. Data Layer** (`/stores`)
- **InMemoryStore**: Generic CRUD
- **ProductStore**: Product-specific operations
- **EventStore**: Event history
- **AlertStore**: Alert management

**4. Kafka Layer** (`/kafka`)
- **Producer**: Event publication
- **Consumer**: Event processing
- **EventGenerator**: Simulation

## Event-Driven Design

### Topics Architecture
```
inventory.sales
  ├─ Partition 0: Product A, D, G...
  ├─ Partition 1: Product B, E, H...
  └─ Partition 2: Product C, F, I...

inventory.restocks
  ├─ Triggered manually or automatically
  └─ When stock < reorder point

inventory.returns
  ├─ Customer returns
  └─ Damaged goods

inventory.alerts
  ├─ Critical alerts
  ├─ Warning alerts
  └─ Info alerts
```

### Event Schema
```typescript
interface Event {
  id: string;              // Unique identifier
  type: EventType;         // SALE | RESTOCK | RETURN | ALERT
  productId: string;       // Product affected
  quantity: number;        // Quantity changed
  warehouse: string;       // Warehouse ID
  timestamp: Date;         // When it occurred
  metadata?: object;       // Additional context
}
```

### Alert Logic

**Critical Low Stock** (currentStock < 10)
```typescript
if (product.currentStock < 10 && product.currentStock >= 0) {
  createAlert('critical', 'CRITICAL_LOW_STOCK', message);
}
```

**Low Stock Warning** (currentStock < reorderPoint)
```typescript
if (product.currentStock < product.reorderPoint) {
  createAlert('warning', 'LOW_STOCK', message);
}
```

**Overstock** (currentStock > 90% capacity)
```typescript
if (product.currentStock > product.maxCapacity * 0.9) {
  createAlert('info', 'OVERSTOCK', message);
}
```

**Rapid Depletion** (>30% decrease in 1 hour)
```typescript
const hourAgo = Date.now() - 3600000;
const recentEvents = events.filter(e => e.timestamp > hourAgo);
const netChange = calculateNetChange(recentEvents);
if (netChange / initialStock > 0.3) {
  createAlert('warning', 'RAPID_DEPLETION', message);
}
```

## Data Models

### Core Entities

**Product**
```typescript
{
  id: string;              // PROD-001
  sku: string;             // SKU-ELE-001
  name: string;            // "Laptop Pro"
  category: string;        // "Electronics"
  warehouse: string;       // WH-1
  currentStock: number;    // 245
  reorderPoint: number;    // 50
  maxCapacity: number;     // 500
  unitPrice: number;       // 1299.99
  predictedStock7d: number;// 210 (AI forecast)
  lastUpdated: Date;
}
```

**Event**
```typescript
{
  id: string;              // EVT-000001
  type: EventType;         // 'SALE'
  productId: string;       // PROD-001
  quantity: number;        // 5
  warehouse: string;       // WH-1
  timestamp: Date;         // 2025-11-04T16:00:00Z
  metadata: {
    generated: boolean;    // true
    productName: string;   // "Laptop Pro"
    category: string;      // "Electronics"
  }
}
```

**Alert**
```typescript
{
  id: string;              // ALT-000001
  productId: string;       // PROD-001
  severity: 'critical' | 'warning' | 'info';
  type: AlertType;         // 'LOW_STOCK'
  message: string;         // Human-readable
  aiRecommendation?: string;
  resolved: boolean;       // false
  timestamp: Date;
  resolvedAt?: Date;
}
```

## Scalability Considerations

### Current (MVP) Architecture
- **Single Node**: All services on one machine
- **In-Memory Storage**: Fast but non-persistent
- **10 events/minute**: Low throughput

### Production Scaling

**Horizontal Scaling**
```
Frontend (Next.js)
  ├─ Instance 1 (Load Balanced)
  ├─ Instance 2
  └─ Instance N

Backend Services
  ├─ Event Generator Service (scaled separately)
  ├─ Consumer Service (multiple instances)
  └─ API Service (scaled for reads)

Kafka Cluster
  ├─ Broker 1
  ├─ Broker 2
  └─ Broker 3 (replication factor: 3)
```

**Database Migration**
- Replace in-memory stores with PostgreSQL
- Add Redis for caching
- Implement proper persistence

**Kafka Scaling**
- Increase partitions (1 → 10+)
- Add consumer group instances
- Enable replication (3x)
- Increase retention (7 days → 30 days)

**Performance Targets**
- **Throughput**: 1000+ events/second
- **Latency**: < 100ms end-to-end
- **Availability**: 99.9% uptime
- **Concurrency**: 10,000+ concurrent users

### Monitoring & Observability
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger or Zipkin
- **Alerting**: PagerDuty integration

---

For more details, see:
- [API Documentation](./API.md)
- [Development Guide](./DEVELOPMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
