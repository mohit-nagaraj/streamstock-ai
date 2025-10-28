# PRD: AI-Enhanced Event-Driven Inventory Management System

## 1. Executive Summary

A real-time inventory management system built for a 5-hour development sprint, featuring event-driven architecture with Kafka, AI-powered forecasting, and a modern web dashboard. The system simulates a multi-warehouse e-commerce environment with automated data generation.

## 2. Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- shadcn/ui components
- Tailwind CSS
- Recharts for data visualization
- Real-time updates via polling

**Backend:**
- Next.js API routes (Node.js)
- Kafka for event streaming
- Prophet/simple time-series forecasting
- In-memory/SQLite database

**Infrastructure:**
- Docker Compose (Kafka, Zookeeper)
- Gemini API for AI insights
- Single Makefile for orchestration

## 3. System Architecture

```
┌─────────────────┐
│  Next.js UI     │
│  (Frontend)     │
└────────┬────────┘
         │
┌────────▼────────┐
│  API Routes     │
│  (Backend)      │
└────┬───────┬────┘
     │       │
     │       └──────► Gemini AI (Insights)
     │
┌────▼────────────┐
│  Kafka Cluster  │
│  (Docker)       │
└─────────────────┘
  │           │
  │ Topics:   │
  │ - sales   │
  │ - restocks│
  │ - alerts  │
  └───────────┘
```

## 4. Core Features

### 4.1 Event Producers (Simulated)
- **Sales Events**: Random purchase events across 3-5 products
- **Restock Events**: Warehouse receiving new inventory
- **Return Events**: Product returns updating stock
- Rate: 5-10 events per minute for realistic demo

### 4.2 Event Consumers
- **Stock Update Consumer**: Updates inventory levels in real-time
- **Alert Consumer**: Triggers low-stock, overstock, and critical alerts
- **Forecast Consumer**: Updates demand predictions every 5 minutes

### 4.3 AI/ML Components
- **Forecasting Model**: Simple moving average or Prophet for 7-day stock prediction
- **Gemini Integration**: Generates smart reorder recommendations based on:
  - Historical trends
  - Current stock levels
  - Seasonal patterns (simulated)
  - Alert severity

### 4.4 Dashboard Pages

#### Page 1: Overview Dashboard (`/`)
- **Real-time Metrics Cards**:
  - Total products
  - Total stock value
  - Active alerts count
  - Today's transactions
- **Live Event Feed**: Last 20 events with animations
- **Stock Health Chart**: Bar chart showing stock levels by product
- **Alerts Panel**: Critical/warning alerts with severity badges

#### Page 2: Inventory Management (`/inventory`)
- **Product Table**:
  - Product name, SKU
  - Current stock
  - Warehouse location
  - Status badge (In Stock/Low/Critical)
  - Predicted stock in 7 days
  - Action buttons
- **Filters**: By warehouse, status, category
- **Search**: By product name/SKU
- **Quick Actions**: Manual restock, view history

#### Page 3: Analytics & Forecasting (`/analytics`)
- **Demand Forecast Chart**: 30-day historical + 7-day prediction line chart
- **Product Performance**: Top/bottom movers
- **Warehouse Distribution**: Pie chart of stock by location
- **AI Insights Panel**: Gemini-generated recommendations
- **Export Data**: CSV download functionality

#### Page 4: Alerts & Actions (`/alerts`)
- **Alert Stream**: Real-time alert feed with filters
- **Alert Categories**:
  - 🔴 Critical: Stock < 10 units
  - 🟡 Warning: Stock < 50 units
  - 🟢 Info: Restock completed
  - 🔵 AI Recommendation: Proactive suggestions
- **Alert Actions**: Mark as resolved, trigger reorder
- **Alert History**: Last 100 alerts with timestamps

#### Page 5: Event Logs (`/events`)
- **Real-time Event Stream**: All Kafka events with filtering
- **Event Types**: Sales, Restocks, Returns, Alerts
- **Event Details**: Expandable JSON view
- **Time Range Filter**: Last 1hr/6hr/24hr/7days
- **Event Statistics**: Count by type (charts)

## 5. Data Model

### Product
```javascript
{
  id: string,
  sku: string,
  name: string,
  category: string,
  warehouse: string,
  currentStock: number,
  reorderPoint: number,
  maxCapacity: number,
  unitPrice: number,
  predictedStock7d: number,
  lastUpdated: timestamp
}
```

### Event
```javascript
{
  id: string,
  type: 'SALE' | 'RESTOCK' | 'RETURN' | 'ALERT',
  productId: string,
  quantity: number,
  warehouse: string,
  timestamp: timestamp,
  metadata: object
}
```

### Alert
```javascript
{
  id: string,
  productId: string,
  severity: 'critical' | 'warning' | 'info',
  type: string,
  message: string,
  aiRecommendation: string,
  resolved: boolean,
  timestamp: timestamp
}
```

## 6. Implementation Plan (5-hour Sprint)

### Hour 1: Infrastructure Setup
- Create Next.js project with shadcn/ui
- Write Dockerfile and docker-compose.yml (Kafka + Zookeeper)
- Create Makefile with `make dev` command
- Setup basic project structure

### Hour 2: Backend Core
- Implement Kafka producer/consumer utilities
- Create data generators (products, events)
- Build API routes:
  - `/api/products` - CRUD
  - `/api/events` - Stream events
  - `/api/alerts` - Get/update alerts
  - `/api/forecast` - Get predictions

### Hour 3: Event System & AI
- Implement event producers (background jobs)
- Setup consumers with alert logic
- Integrate simple forecasting (moving average)
- Add Gemini API for insights generation

### Hour 4: Frontend Pages
- Build Overview Dashboard with real-time updates
- Create Inventory Management page
- Add Analytics page with charts
- Implement alert system UI

### Hour 5: Polish & Testing
- Add Alerts & Events pages
- Implement filtering and search
- Add animations and loading states
- Test full flow, fix bugs
- Document README

## 7. Key Technical Decisions

### 7.1 Data Persistence
- **In-memory store** for rapid development
- Optionally persist to SQLite if time permits
- All data regenerates on restart (acceptable for demo)

### 7.2 Real-time Updates
- **Polling every 2-3 seconds** instead of WebSockets (simpler)
- Consider Server-Sent Events (SSE) if time allows

### 7.3 Forecasting Approach
- **Simple Moving Average (SMA)** as primary method (fast, no ML dependencies)
- Calculate 7-day prediction based on last 30 days
- Store predictions in memory, recalculate every 5 minutes

### 7.4 Kafka Simplification
- Single partition per topic (sufficient for demo)
- Auto-commit consumer offsets
- Topics: `inventory.sales`, `inventory.restocks`, `inventory.alerts`

### 7.5 AI Integration
- Gemini API called on-demand (not for every event)
- Cache recommendations for 5-10 minutes
- Fallback to rule-based if API fails

## 8. Data Generation Strategy

### 8.1 Initial Seed Data
- 10-15 products across 3 categories (Electronics, Apparel, Home Goods)
- 3 warehouses (West Coast, East Coast, Midwest)
- Stock levels: 50-500 units per product
- 30 days of historical events for forecasting

### 8.2 Runtime Events
- **Sales**: Random products, 1-10 units, weighted by popularity
- **Restocks**: Triggered when stock < reorder point, adds 100-300 units
- **Returns**: 5% of sales events
- Event rate: ~10 events/minute (adjustable)

## 9. Alert Logic

### Alert Triggers
1. **Critical Low Stock**: currentStock < 10 units
2. **Low Stock Warning**: currentStock < reorderPoint
3. **Overstock**: currentStock > 0.9 * maxCapacity
4. **Rapid Depletion**: Stock decreased > 30% in last hour
5. **AI Recommendation**: Gemini suggests proactive action

### Alert Resolution
- Auto-resolve when conditions no longer met
- Manual resolution via UI
- Alerts expire after 24 hours if unresolved

## 10. UI/UX Requirements

### Design Principles
- **Dark mode ready** (default light, toggle available)
- **Responsive**: Works on desktop/tablet (mobile optional)
- **Real-time feel**: Smooth animations, live updates
- **Data-dense**: Max info, minimal clutter

### Component Library (shadcn/ui)
- Badge, Button, Card, Table, Dialog
- Alert, Tabs, Select, Input
- Chart (via Recharts integration)
- Toast notifications for alerts

### Color Coding
- 🔴 Critical: Red (stock < 10)
- 🟡 Warning: Yellow (stock < reorder point)
- 🟢 Healthy: Green (stock optimal)
- 🔵 Overstocked: Blue (stock > 90% capacity)

## 11. Makefile Commands

```makefile
make dev          # Start everything (Docker + Next.js)
make docker-up    # Start Kafka/Zookeeper only
make docker-down  # Stop Docker services
make clean        # Clean Docker volumes/images
make logs         # Show Docker logs
```

## 12. Success Criteria

✅ **Functional Requirements**
- Real-time event streaming through Kafka
- AI-powered stock predictions
- 5+ functional pages
- Alert system with notifications
- Realistic data generation

✅ **Technical Requirements**
- Single `make dev` command starts everything
- Docker containers run successfully
- Frontend-backend integration working
- No physical sensors needed

✅ **Polish Requirements**
- Modern, fancy UI with animations
- Multiple visualization types (charts, tables, cards)
- Proper loading states and error handling
- Responsive design

## 13. Future Enhancements (Out of Scope)

- Multi-tenant support
- User authentication
- Advanced ML models (ARIMA, LSTM)
- WebSocket real-time updates
- Historical data export
- Integration with real e-commerce APIs
- Mobile app
- Email/SMS alert notifications

## 14. Environment Variables

```env
# .env.local
GEMINI_API_KEY=your_api_key_here
KAFKA_BROKER=localhost:9092
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 15. Deliverables

1. **Codebase**: Fully functional Next.js app with Kafka integration
2. **Docker Setup**: Working docker-compose.yml
3. **Makefile**: Single command deployment
4. **README**: Setup instructions, architecture diagram
5. **Demo Data**: Pre-seeded products and events
6. **Video/Screenshots**: Show all 5 pages working
