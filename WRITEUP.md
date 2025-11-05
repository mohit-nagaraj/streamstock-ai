# StreamStock AI - Project Write-up

## Project Overview

### Objective
StreamStock AI is designed to revolutionize inventory management through real-time event processing and AI-powered analytics. The primary objective is to create a scalable, event-driven system that processes inventory transactions asynchronously, generates intelligent alerts for critical stock conditions, and provides predictive forecasting to enable proactive decision-making. Unlike traditional inventory systems that rely on periodic batch processing, StreamStock AI delivers instant visibility into stock levels across multiple warehouses, helping businesses reduce stockouts, minimize overstock situations, and optimize working capital.

### Overall Concept
The system implements a producer-consumer architecture where inventory events (sales, restocks, returns, alerts) are published to Apache Kafka topics and processed asynchronously by consumer services. A modern web dashboard provides real-time visualization of inventory metrics, active alerts, sales trends, and 7-day stock forecasts. The architecture follows microservices principles with clear separation between the presentation layer (Next.js frontend), business logic layer (Node.js backend), event processing layer (Kafka producers/consumers), and infrastructure layer (Docker containers). This decoupled design enables independent scaling of components, fault isolation, and flexibility in technology choices for different system parts.

---

## Implementation Details

### Architecture Components

**1. Frontend Layer (Next.js 14)**
- **Technology**: React-based framework with App Router for server-side rendering
- **Port**: 3001
- **Pages Implemented**:
  - Dashboard: Real-time KPIs (total products, low stock count, alerts, total inventory value)
  - Inventory Management: Product listings with search, filter, and update capabilities
  - Analytics & Forecasting: Interactive charts showing sales trends and 7-day predictions
  - Alerts & Actions: Critical notifications with AI recommendations
  - Event Logs: Complete audit trail of all inventory transactions
- **UI Components**: shadcn/ui component library for accessible, beautiful interfaces
- **Styling**: Tailwind CSS v4 for utility-first responsive design with dark mode support
- **Charts**: Recharts library for data visualization (line charts, bar charts, area charts)

**2. Backend Services (Node.js + TypeScript)**
- **Technology**: Express.js REST API with TypeScript for type safety
- **Port**: 4000
- **Data Storage**: In-memory JavaScript Maps for fast access:
  - Products Map: SKU, name, quantity, reorder point, warehouse location
  - Events Map: Event ID, type, timestamp, product ID, quantity, metadata
  - Alerts Map: Alert ID, severity, status, product reference, recommendations
  - Warehouses Map: Location details, capacity, current utilization
- **API Endpoints**:
  - `GET /api/products` - List all products with pagination
  - `GET /api/products/:id` - Get product details with current stock
  - `PUT /api/products/:id` - Update product information
  - `GET /api/events` - Retrieve events with type/date filters
  - `GET /api/alerts` - Get active alerts by severity
  - `POST /api/alerts/:id/resolve` - Mark alerts as resolved
  - `GET /api/forecast` - 7-day stock predictions by product
  - `GET /api/recommendations` - AI-powered reorder suggestions
  - `GET /api/metrics` - Dashboard aggregated metrics

**3. Event Processing Layer (KafkaJS)**
- **Producer Implementation** (backend/src/kafka/producer.ts):
  - Client ID: `streamstock-producer`
  - Retry mechanism: 5 attempts with 300ms initial delay
  - Transaction timeout: 30 seconds
  - Message partitioning: Uses `productId` as key for ordered processing
  - Batch processing: `sendEventBatch()` groups events by topic
  - Topic routing: Automatic routing based on event type

- **Consumer Implementation** (backend/src/kafka/consumer.ts):
  - Consumer group: `streamstock-inventory-group`
  - Session timeout: 30 seconds (failure detection)
  - Heartbeat interval: 3 seconds (liveness indication)
  - Offset strategy: `fromBeginning: false` (process new messages only)
  - Error handling: Try-catch with logging and dead letter queue placeholders

- **Event Generator** (backend/src/kafka/eventGenerator.ts):
  - Simulates realistic inventory events at 10 events/minute (configurable)
  - Event types: SALE (60%), RESTOCK (25%), RETURN (10%), ALERT (5%)
  - Randomized product selection and quantity generation
  - Metadata enrichment with timestamps and correlation IDs

**4. Infrastructure Layer (Docker + Docker Compose)**
- **Zookeeper Service**:
  - Image: `confluentinc/cp-zookeeper:7.5.0`
  - Port: 2181
  - Purpose: Cluster coordination, broker registration, metadata management
  - Volumes: `zookeeper-data` (metadata), `zookeeper-logs` (transaction logs)
  - Configuration: 2-second tick time for session management

- **Kafka Service**:
  - Image: `confluentinc/cp-kafka:7.5.0`
  - Ports: 9092 (external), 29092 (internal), 9093 (JMX metrics)
  - Broker ID: 1
  - Listeners: Dual-listener configuration for dev/prod parity
  - Topics: 4 primary topics with auto-creation enabled
  - Replication factor: 1 (development), recommended 3 (production)
  - Log retention: 168 hours (7 days)
  - Health check: `kafka-broker-api-versions` every 30 seconds
  - Volume: `kafka-data` for persistent message storage

- **Network Configuration**:
  - Network name: `streamstock-network`
  - Driver: bridge (container-to-container communication)
  - DNS resolution: kafka:29092, zookeeper:2181

- **Makefile Automation**:
  - `make help` - Self-documenting command list
  - `make install` - Install all dependencies
  - `make dev` - Start full stack (Kafka + Backend + Frontend)
  - `make docker-up` - Start Kafka and Zookeeper only
  - `make docker-down` - Stop all containers
  - `make logs` - Stream logs from all containers
  - `make logs-kafka` - Kafka-specific logs
  - `make logs-zookeeper` - Zookeeper-specific logs
  - `make clean` - Remove containers and volumes
  - `make reset` - Full environment reset with reinstall

### AI/ML Features

**1. Stock Forecasting (7-Day Prediction)**
- **Algorithm**: Simple Moving Average (SMA)
- **Implementation**: Analyzes last 7 days of sales history
- **Output**: Daily predicted stock levels with confidence scores
- **Confidence Calculation**: Based on sales velocity consistency and trend detection
- **Use Case**: Proactive reordering before stockouts occur

**2. AI Recommendations Engine**
- **Type**: Rule-based expert system
- **Priority Levels**: Critical, High, Medium, Low
- **Factors Analyzed**:
  - Current stock vs. reorder point
  - Sales velocity trends (increasing/decreasing)
  - Days until stockout (if applicable)
  - Warehouse capacity utilization
- **Caching**: 5-minute TTL for performance optimization
- **Example Recommendations**:
  - "URGENT: Reorder 500 units immediately - stockout predicted in 2 days"
  - "Consider reducing reorder point - consistent overstock pattern"
  - "Slow-moving item - evaluate SKU rationalization"

**3. Alert Generation System**
- **Critical Low Stock**: Quantity < 10 units (immediate action required)
- **Low Stock Warning**: Quantity < reorder point (plan replenishment)
- **Overstock Detection**: Quantity > 90% warehouse capacity (space optimization)
- **Rapid Depletion**: >30% quantity decrease in 1 hour (demand spike detection)
- **Integration**: Alerts published to `inventory.alerts` Kafka topic

---

## Tools and Technologies - Importance & Justification

### 1. Apache Kafka 7.5.0 (Event Streaming Platform)
**Importance**:
- **Asynchronous Processing**: Decouples event producers from consumers, enabling independent scaling
- **Durability**: Persistent message storage with configurable retention ensures no data loss
- **Scalability**: Horizontal scaling through partitions and consumer groups handles high throughput
- **Fault Tolerance**: Replication and distributed architecture prevent single points of failure
- **Real-time Processing**: Sub-millisecond message delivery enables instant inventory updates

**Why Kafka for This Project**:
Inventory events occur continuously and unpredictably. Kafka's publish-subscribe model allows multiple consumers (alert system, forecasting engine, audit logger) to independently process the same events without impacting each other. The partition-based architecture ensures events for the same product are processed in order, maintaining data consistency.

### 2. Docker & Docker Compose (Containerization)
**Importance**:
- **Environment Consistency**: Eliminates "works on my machine" issues across development teams
- **Isolation**: Services run in separate containers, preventing dependency conflicts
- **Portability**: Same containers run identically on dev, staging, and production
- **Resource Management**: Container limits prevent resource exhaustion
- **Orchestration**: Docker Compose manages multi-container dependencies and networking

**Why Docker for This Project**:
Kafka and Zookeeper have complex setup requirements with specific Java versions and configurations. Docker abstracts this complexity, allowing developers to start the entire stack with a single `make docker-up` command. Persistent volumes ensure data survives container restarts during development.

### 3. Next.js 14 (Frontend Framework)
**Importance**:
- **Server-Side Rendering**: Improves SEO and initial page load performance
- **App Router**: File-system-based routing simplifies navigation structure
- **API Routes**: Backend-for-frontend pattern enables data aggregation and transformation
- **Automatic Code Splitting**: Reduces bundle size by loading only required JavaScript
- **TypeScript Support**: Type safety prevents runtime errors in the UI layer

**Why Next.js for This Project**:
Real-time dashboards require fast initial loads and efficient data updates. Next.js's server components reduce client-side JavaScript, while React's state management enables real-time UI updates as events flow through Kafka. The framework's built-in optimization ensures the dashboard remains responsive even with frequent data refreshes.

### 4. Node.js + TypeScript (Backend Runtime)
**Importance**:
- **Event-Driven Architecture**: Node.js's non-blocking I/O aligns with Kafka's async processing model
- **JavaScript Ecosystem**: KafkaJS, Express, and other npm packages provide mature Kafka integration
- **Type Safety**: TypeScript catches type errors at compile time, reducing production bugs
- **Performance**: V8 engine provides fast execution for I/O-bound operations
- **Developer Experience**: Shared language (TypeScript) between frontend and backend

**Why Node.js for This Project**:
Kafka message processing is I/O-bound (network communication, JSON parsing), making Node.js's single-threaded event loop ideal. The async/await syntax simplifies producer and consumer code, while TypeScript interfaces ensure event schemas are consistent across the codebase.

### 5. KafkaJS (Kafka Client Library)
**Importance**:
- **Native JavaScript**: Pure JS implementation, no native dependencies or compilation required
- **Promise-Based API**: Modern async/await syntax for cleaner code
- **Producer Features**: Batch sending, compression, transaction support
- **Consumer Features**: Consumer groups, offset management, rebalancing
- **Active Maintenance**: Regular updates with security patches and feature additions

**Why KafkaJS for This Project**:
Alternatives like `node-rdkafka` (librdkafka bindings) require native compilation, complicating deployment. KafkaJS's pure JavaScript implementation works across platforms (Windows, Linux, macOS) without build tools. The library's API design matches Kafka's concepts directly, reducing the learning curve.

### 6. shadcn/ui + Tailwind CSS (UI Framework)
**Importance**:
- **Accessibility**: ARIA-compliant components ensure usability for all users
- **Customization**: Component source code is copied to project, enabling full control
- **Design System**: Consistent spacing, colors, and typography across the application
- **Dark Mode**: Built-in theme switching without custom CSS
- **Performance**: Tailwind's utility classes minimize CSS bundle size

**Why shadcn/ui for This Project**:
Inventory dashboards require tables, charts, modals, and forms. shadcn/ui provides production-ready components that work out-of-the-box while remaining customizable. The component library integrates seamlessly with Recharts for data visualization, maintaining visual consistency.

### 7. Make (Build Automation)
**Importance**:
- **Cross-Platform**: Works on Linux, macOS, and Windows (via WSL)
- **Dependency Management**: Targets can depend on other targets for ordered execution
- **Idempotency**: Commands can be run multiple times safely
- **Self-Documentation**: Comments become help text via `make help`
- **Shell Integration**: Direct execution of Docker, npm, and Git commands

**Why Make for This Project**:
Starting a full-stack application with Kafka requires multiple terminal windows and command sequences. The Makefile consolidates this into single commands (`make dev`), reducing onboarding time for new developers. The self-documenting help system serves as quick reference documentation.

---

## Dataset Details

### Data Source
**Synthetic Data Generation**: The project uses programmatically generated data rather than external datasets. This approach provides several advantages:
1. **Privacy Compliance**: No real customer or business data, eliminating GDPR/CCPA concerns
2. **Controllability**: Data characteristics (volume, distribution, edge cases) are fully customizable
3. **Reproducibility**: Seeding scripts generate consistent data for testing and demos
4. **Scalability**: Can generate datasets of any size to test system limits

### Data Generation Implementation

**1. Seeding Script** (backend/src/utils/seeder.ts)
- **Products**: 50 sample products with realistic attributes
  - SKUs: Sequential format (PROD-001 to PROD-050)
  - Names: Electronics, furniture, clothing, food items
  - Categories: 10 categories (Electronics, Clothing, Food, Furniture, etc.)
  - Prices: Range from $10 to $5000 based on category
  - Initial stock: 50-500 units per product
  - Reorder points: 20-100 units (triggers restocking alerts)
  - Warehouse assignment: 5 warehouses (WH-NORTH, WH-SOUTH, WH-EAST, WH-WEST, WH-CENTRAL)

- **Warehouses**: 5 distribution centers
  - Locations: North, South, East, West, Central
  - Capacity: 10,000-50,000 units per warehouse
  - Specialization: Some warehouses specialize in product categories

- **Historical Events**: 1000 initial events for forecasting training
  - Event types: SALE (60%), RESTOCK (25%), RETURN (10%), ALERT (5%)
  - Timestamps: Distributed over last 30 days
  - Quantities: Realistic ranges (1-50 units for sales, 100-500 for restocks)

**2. Real-Time Event Generation** (backend/src/kafka/eventGenerator.ts)
- **Frequency**: 10 events per minute (configurable via EVENTS_PER_MINUTE env variable)
- **Event Distribution**:
  - Sales: 60% (simulates customer purchases)
  - Restocks: 25% (simulates warehouse replenishment)
  - Returns: 10% (simulates customer returns)
  - Alerts: 5% (simulates system-generated alerts)
- **Realism Features**:
  - Business hours weighting (more events during 9am-5pm)
  - Seasonal patterns (higher sales on certain days)
  - Product popularity distribution (some products sell faster)
  - Stock depletion simulation (sales reduce inventory)

### Key Features of Generated Data

**Product Attributes**:
```typescript
{
  id: string,              // Unique identifier (PROD-001)
  sku: string,             // Stock Keeping Unit
  name: string,            // Product name
  category: string,        // Product category
  quantity: number,        // Current stock level
  reorderPoint: number,    // Minimum stock threshold
  price: number,           // Unit price in USD
  warehouseId: string,     // Assigned warehouse
  lastUpdated: Date        // Last modification timestamp
}
```

**Event Attributes**:
```typescript
{
  id: string,              // Unique event identifier
  type: EventType,         // SALE | RESTOCK | RETURN | ALERT
  productId: string,       // Product reference
  warehouseId: string,     // Warehouse reference
  quantity: number,        // Units affected
  timestamp: Date,         // Event occurrence time
  metadata: {              // Additional context
    orderId?: string,      // For sales/returns
    supplierId?: string,   // For restocks
    reason?: string        // For alerts
  }
}
```

**Alert Attributes**:
```typescript
{
  id: string,              // Unique alert identifier
  productId: string,       // Affected product
  type: AlertType,         // LOW_STOCK | CRITICAL_LOW | OVERSTOCK | RAPID_DEPLETION
  severity: string,        // critical | high | medium | low
  message: string,         // Human-readable description
  recommendation: string,  // AI-generated action suggestion
  status: string,          // active | resolved | dismissed
  createdAt: Date,         // Alert generation time
  resolvedAt?: Date        // Resolution timestamp (if applicable)
}
```

### Data Characteristics

**Volume Metrics**:
- Products: 50 items across 5 warehouses
- Historical events: 1000+ events (30-day history)
- Real-time events: 14,400 events/day (10/minute × 1440 minutes)
- Alerts: ~50-100 active alerts at any time
- Forecast data points: 7 predictions per product × 50 products = 350 forecasts

**Data Quality**:
- **Consistency**: All product IDs in events reference existing products
- **Temporal Ordering**: Events have sequential timestamps
- **Realistic Constraints**: Stock quantities never go negative (validation enforced)
- **Referential Integrity**: Warehouse IDs, product IDs maintain proper relationships

**Edge Cases Included**:
- Zero-stock scenarios (testing critical alerts)
- High-volume products (testing rapid depletion detection)
- Slow-moving items (testing overstock scenarios)
- Sudden demand spikes (testing alert sensitivity)

---

## Applications

### 1. E-Commerce Inventory Management
**Use Case**: Online retailers with multiple warehouses managing thousands of SKUs
**Benefits**:
- Real-time stock visibility across all locations prevents overselling
- Automated reorder alerts ensure popular items remain in stock
- Forecasting optimizes working capital by ordering only what's needed
- Event audit trail provides compliance documentation for financial reporting

### 2. Retail Chain Management
**Use Case**: Brick-and-mortar stores with centralized inventory control
**Benefits**:
- Store-to-warehouse transfer recommendations based on local demand
- Seasonal trend detection for proactive stocking decisions
- Overstock alerts enable markdowns before inventory becomes obsolete
- Multi-location visibility prevents stockouts in high-demand stores

### 3. Manufacturing Supply Chain
**Use Case**: Manufacturers tracking raw materials and finished goods
**Benefits**:
- Just-in-time inventory reduces warehousing costs
- Critical low stock alerts prevent production line stoppages
- Supplier performance tracking through restock event analysis
- Integration potential with ERP systems via Kafka event bridge

### 4. Food Service & Perishables
**Use Case**: Restaurants, grocery stores managing expiring inventory
**Benefits**:
- Rapid depletion alerts identify unexpected demand (e.g., viral menu item)
- Forecasting reduces food waste by ordering perishables in smaller batches
- Real-time dashboards enable quick response to stock issues
- Event logs trace food safety incidents to specific batches

### 5. Healthcare & Pharmaceuticals
**Use Case**: Hospitals, pharmacies managing critical medical supplies
**Benefits**:
- Critical low stock alerts ensure life-saving medications remain available
- Compliance documentation for FDA-regulated inventory tracking
- Expiration date management through metadata enrichment
- Multi-facility coordination for emergency supply transfers

### 6. Educational/Demonstration Platform
**Use Case**: Teaching distributed systems, event-driven architecture, and Kafka
**Benefits**:
- Realistic business scenario makes abstract concepts concrete
- Hands-on experience with production-grade tools (Kafka, Docker)
- Observable message flow demonstrates async processing visually
- Extensible architecture allows students to add features

---

## Limitations

### Project Limitations

**1. Development Configuration**
- **Single Broker**: Current setup uses one Kafka broker, eliminating fault tolerance. If the broker fails, the entire event processing system stops.
- **Replication Factor 1**: No message replication means data loss if Kafka crashes before consumer processing.
- **No Load Balancing**: Single producer/consumer instances limit throughput to ~10 events/minute.
- **Mitigation**: Production deployment requires 3+ broker cluster with replication factor 3.

**2. In-Memory Data Storage**
- **No Persistence**: Backend restart loses all product, event, and alert data.
- **Scalability Ceiling**: Memory constraints limit dataset size to thousands of products, not millions.
- **No Transactions**: Concurrent updates may cause race conditions without database ACID guarantees.
- **Mitigation**: Replace Maps with PostgreSQL or MongoDB for persistence and scalability.

**3. Security Gaps**
- **No Authentication**: Kafka, API, and frontend lack user authentication/authorization.
- **Unencrypted Communication**: Plaintext Kafka listeners expose messages to network sniffing.
- **No Input Validation**: API endpoints vulnerable to injection attacks and malformed data.
- **Mitigation**: Implement JWT authentication, SASL/SSL for Kafka, input sanitization.

**4. Limited AI Capabilities**
- **Simple Algorithms**: SMA forecasting doesn't account for seasonality, promotions, or external factors.
- **No Machine Learning**: Rule-based recommendations miss complex patterns ML models could detect.
- **No Model Training**: Forecasts use hardcoded logic rather than learning from historical data.
- **Mitigation**: Integrate TensorFlow.js for neural network forecasting, online learning from events.

**5. Monitoring & Observability**
- **Basic Logging**: Console logs insufficient for troubleshooting production issues.
- **No Metrics**: Missing performance metrics (latency, throughput, error rates).
- **No Alerting**: System failures detected manually rather than automated alerts.
- **Mitigation**: Add Prometheus metrics, Grafana dashboards, PagerDuty integration.

### Tool Limitations

**1. Apache Kafka**
- **Operational Complexity**: Requires Zookeeper (being deprecated), careful tuning, and expertise.
- **Storage Costs**: Long retention periods consume significant disk space.
- **Rebalancing Delays**: Consumer group rebalancing can cause temporary processing pauses.
- **Learning Curve**: Concepts like partitions, offsets, and consumer groups are non-intuitive.

**2. Docker (Development Mode)**
- **Resource Overhead**: Containers consume more resources than native processes.
- **Networking Complexity**: Port mapping and DNS resolution add troubleshooting difficulty.
- **Volume Management**: Data persistence requires explicit volume configuration.
- **Performance**: Slight latency compared to bare-metal installations.

**3. Next.js (Client-Side Constraints)**
- **SEO Limitations**: Real-time data updates require client-side JavaScript, reducing SEO effectiveness.
- **Bundle Size**: React and Next.js add ~200KB minimum bundle size.
- **Hydration Complexity**: Server-rendered content must match client-rendered output precisely.
- **API Route Limitations**: Not a full backend replacement; lacks advanced features like WebSockets.

**4. Node.js (Single-Threaded)**
- **CPU-Bound Tasks**: Intensive calculations (complex forecasting) block the event loop.
- **Memory Leaks**: Long-running processes prone to memory leaks without careful management.
- **Error Handling**: Unhandled promise rejections can crash the entire process.
- **Scaling**: Vertical scaling limited; horizontal scaling requires clustering or load balancers.

**5. KafkaJS**
- **Performance**: Slower than librdkafka native bindings (pure JS implementation).
- **Feature Gaps**: Missing some advanced Kafka features like exactly-once semantics.
- **Error Handling**: Generic errors make troubleshooting difficult compared to native clients.
- **Community Size**: Smaller community than Java/Python Kafka clients.

### Dataset Limitations

**1. Synthetic Data Unrealism**
- **No Market Dynamics**: Real demand has seasonality, trends, and external shocks (e.g., pandemic) not modeled.
- **Simplified Patterns**: Uniform random distributions don't reflect real-world product popularity (Pareto distribution).
- **No Data Quality Issues**: Real data has missing values, duplicates, and errors that synthetic data lacks.
- **Impact**: Forecasting accuracy untested on real-world complexity.

**2. Limited Scale**
- **Small Dataset**: 50 products insufficient to test enterprise-scale performance (100K+ SKUs).
- **Low Event Volume**: 10 events/minute doesn't stress-test Kafka's throughput capabilities.
- **Single Warehouse Scenario**: Real systems handle hundreds of warehouses with complex routing.
- **Impact**: Unknown behavior under production load.

**3. Missing Data Dimensions**
- **No Customer Data**: Can't analyze customer segmentation, loyalty, or lifetime value.
- **No Supplier Data**: Missing lead times, reliability, and pricing variability.
- **No Financial Data**: Lacks cost basis, margin analysis, and carrying costs.
- **No External Data**: Weather, holidays, competitors, economic indicators not incorporated.
- **Impact**: Recommendations lack business context for real decision-making.

**4. Static Product Catalog**
- **No Product Lifecycle**: Missing new product launches, discontinuations, and SKU updates.
- **No Variants**: Doesn't model sizes, colors, or other product variations.
- **No Bundling**: Can't track product bundles or kit assemblies.
- **Impact**: Doesn't reflect dynamic nature of real inventory systems.

---

## Future Enhancements

To address these limitations, future versions should consider:

1. **Infrastructure Upgrades**:
   - Multi-broker Kafka cluster with KRaft mode (no Zookeeper)
   - PostgreSQL database with read replicas for scalability
   - Redis caching layer for frequently accessed data
   - Kubernetes deployment for container orchestration

2. **Advanced Analytics**:
   - LSTM neural networks for time-series forecasting
   - Collaborative filtering for product recommendations
   - Anomaly detection using isolation forests
   - A/B testing framework for recommendation algorithms

3. **Enterprise Features**:
   - Multi-tenancy support for SaaS deployment
   - Role-based access control (RBAC)
   - Audit logging with immutable event store
   - Integration APIs for ERP systems (SAP, Oracle)

4. **Observability Stack**:
   - Prometheus for metrics collection
   - Grafana for visualization dashboards
   - Elasticsearch for log aggregation
   - Jaeger for distributed tracing

5. **Real Data Integration**:
   - CSV/Excel import for existing inventory data
   - Shopify/WooCommerce API connectors
   - IoT sensor integration for warehouse automation
   - External API enrichment (weather, holidays, trends)

---

## Conclusion

StreamStock AI demonstrates the practical application of event-driven architecture, containerization, and modern web technologies in solving real-world inventory management challenges. The project successfully balances educational value with production-grade practices, providing a foundation for understanding distributed systems while remaining extensible for enterprise deployment. Despite current limitations in scale, security, and AI sophistication, the modular architecture enables incremental enhancements without requiring complete rewrites. The synthetic dataset approach prioritizes reproducibility and privacy while acknowledging the need for real-world data validation in production scenarios.

---

**Project Repository**: https://github.com/mohit-nagaraj/streamstock-ai
**Documentation**: See `/docs` folder for API reference, architecture diagrams, and deployment guides
**Demo**: Access at http://localhost:3001 after running `make dev`
