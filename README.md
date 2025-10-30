# StreamStock AI

**AI-Enhanced Event-Driven Inventory Management System**

A real-time inventory management system featuring event-driven architecture with Kafka, AI-powered forecasting, and a modern web dashboard. Built for demonstration of production-grade event streaming and machine learning integration.

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2014-black)](https://nextjs.org/)
[![Kafka](https://img.shields.io/badge/Streaming-Apache%20Kafka-231F20)](https://kafka.apache.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## 🚀 Quick Start

```bash
# Install dependencies
make install

# Start all services (Kafka + Backend + Frontend)
make dev
```

Access the dashboard at `http://localhost:3000`

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Documentation](#-documentation)
- [Contributing](#-contributing)

## ✨ Features

### Real-Time Event Processing
- **Kafka Event Streaming**: Async, scalable message processing
- **Producer-Consumer Pattern**: Decoupled, high-throughput architecture
- **10 events/minute** simulation (configurable)

### Intelligent Alerts
- 🔴 **Critical Low Stock**: < 10 units
- 🟡 **Low Stock Warning**: < reorder point
- 🟢 **Overstock Detection**: > 90% capacity
- ⚡ **Rapid Depletion**: > 30% decrease in 1 hour
- 🤖 **AI Recommendations**: Powered by Gemini API

### AI/ML Capabilities
- **7-Day Stock Forecasting**: ARIMA/Prophet models
- **Demand Prediction**: Historical trend analysis
- **Smart Reordering**: AI-driven recommendations

### Modern Dashboard
- 📊 Real-time metrics and KPIs
- 📈 Interactive charts (Recharts)
- 🎨 Beautiful UI (shadcn/ui + Tailwind CSS)
- 🌓 Dark mode support
- 📱 Responsive design

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                   │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────────────┐   │
│  │  Dashboard  │ │  Inventory  │ │  Analytics/Alerts  │   │
│  └──────┬──────┘ └──────┬──────┘ └─────────┬──────────┘   │
│         │                │                  │                │
│         └────────────────┴──────────────────┘                │
│                          │                                    │
│                  API Routes (REST)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                  Backend (Node.js/TypeScript)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              In-Memory Data Stores                   │   │
│  │  ┌─────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐│   │
│  │  │Products │  │ Events │  │ Alerts  │  │Warehouses││   │
│  │  └─────────┘  └────────┘  └─────────┘  └──────────┘│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Event Processing Layer                   │   │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────┐ │   │
│  │  │EventGenerator│  │  EventHandler  │  │Forecaster│ │   │
│  │  └──────┬───────┘  └────────┬───────┘  └────┬─────┘ │   │
│  └─────────┼──────────────────┼────────────────┼───────┘   │
│            │                  │                │             │
│         Producer           Consumer       AI Models          │
└────────────┼──────────────────┼────────────────┼────────────┘
             │                  │                │
             ▼                  ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Apache Kafka (Docker)                     │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │inventory.    │  │inventory.   │  │inventory.         │  │
│  │  sales       │  │  restocks   │  │  alerts           │  │
│  └──────────────┘  └─────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
             │                  │                │
             └──────────────────┴────────────────┘
                           Zookeeper
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS v4** - Utility-first styling
- **Recharts** - Data visualization
- **TypeScript** - Type safety

### Backend
- **Node.js** - JavaScript runtime
- **KafkaJS** - Kafka client for Node.js
- **TypeScript** - Type-safe backend
- **In-Memory Stores** - Fast data access (Maps)

### Infrastructure
- **Docker** - Containerization
- **Apache Kafka 7.5.0** - Event streaming
- **Zookeeper** - Kafka coordination
- **Make** - Build automation

### AI/ML
- **Gemini API** - AI-powered recommendations
- **Prophet/ARIMA** - Time-series forecasting
- **Moving Average** - Simple predictions

## 📦 Installation

### Prerequisites
- **Node.js** 20+ and npm
- **Docker** and Docker Compose
- **Make** (optional, for convenience)

### Step 1: Clone Repository
```bash
git clone https://github.com/mohit-nagaraj/streamstock-ai.git
cd streamstock-ai
```

### Step 2: Install Dependencies
```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

### Step 3: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# GEMINI_API_KEY=your_key_here
# KAFKA_BROKER=localhost:9092
```

### Step 4: Start Services
```bash
# Start Kafka and Zookeeper
make docker-up

# Seed demo data
cd backend && npm run seed

# Start backend (in one terminal)
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

Or use the single command:
```bash
make dev
```

## 🎯 Usage

### Makefile Commands

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make install` | Install all dependencies |
| `make dev` | Start all services (Kafka + Frontend + Backend) |
| `make docker-up` | Start Kafka and Zookeeper only |
| `make docker-down` | Stop Docker containers |
| `make logs` | Show all container logs |
| `make logs-kafka` | Show Kafka logs only |
| `make logs-zookeeper` | Show Zookeeper logs only |
| `make clean` | Remove Docker volumes and containers |
| `make build` | Build frontend for production |
| `make reset` | Full reset (clean + reinstall) |

### Backend Commands

```bash
cd backend

# Run backend server
npm run dev

# Seed demo data
npm run seed

# Test Kafka producer
npm run test-producer
```

### Frontend Commands

```bash
cd frontend

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📡 API Documentation

See [docs/API.md](./docs/API.md) for detailed API documentation.

### Quick Reference

**Products**
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product

**Events**
- `GET /api/events` - Get recent events
- `GET /api/events?type=SALE` - Filter by type

**Alerts**
- `GET /api/alerts` - Get active alerts
- `POST /api/alerts/:id/resolve` - Resolve alert

**Forecasts**
- `GET /api/forecast` - Get stock predictions
- `GET /api/forecast/:productId` - Get product forecast

## 📁 Project Structure

```
streamstock-ai/
├── frontend/              # Next.js frontend
│   ├── app/              # App Router pages
│   │   ├── page.tsx      # Dashboard
│   │   ├── inventory/    # Inventory management
│   │   ├── analytics/    # Analytics & forecasting
│   │   ├── alerts/       # Alerts & actions
│   │   └── events/       # Event logs
│   ├── components/       # React components
│   │   └── ui/           # shadcn/ui components
│   └── lib/              # Utilities and API clients
│
├── backend/              # Node.js backend
│   └── src/
│       ├── models/       # TypeScript interfaces
│       ├── stores/       # In-memory data stores
│       ├── services/     # Business logic
│       ├── kafka/        # Kafka producer/consumer
│       └── utils/        # Utilities (seeder, etc.)
│
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md   # System architecture
│   ├── API.md            # API documentation
│   ├── DEPLOYMENT.md     # Deployment guide
│   └── DEVELOPMENT.md    # Development guide
│
├── docker-compose.yml    # Kafka & Zookeeper setup
├── Makefile              # Build automation
└── README.md             # This file
```

## 👨‍💻 Development

### Running in Development Mode

1. **Start Kafka**
   ```bash
   make docker-up
   ```

2. **Start Backend** (Terminal 1)
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3000/api

### Event Flow Testing

```bash
# 1. Seed data
cd backend && npm run seed

# 2. Test producer
npm run test-producer

# 3. Monitor Kafka topics
docker exec -it streamstock-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic inventory.sales \
  --from-beginning
```

### Code Quality

```bash
# Frontend linting
cd frontend && npm run lint

# Backend type checking
cd backend && npm run build
```

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design and data flow
- **[API Reference](./docs/API.md)** - Complete API documentation
- **[Development Guide](./docs/DEVELOPMENT.md)** - Setup and workflow
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Event streaming powered by [Apache Kafka](https://kafka.apache.org/)
- AI insights by [Google Gemini](https://ai.google.dev/)

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Made with ❤️ using Claude Code and StreamStock AI**
