# AI-Powered Recommendations System

## Overview

StreamStock AI uses a **rule-based AI system** to generate intelligent inventory recommendations. The system analyzes sales patterns, stock levels, and historical data to provide actionable insights.

## How It Works

### 1. Sales Velocity Analysis

The system calculates **average daily sales** over the last 30 days:

```typescript
Sales Velocity = Total Units Sold (Last 30 Days) / 30
```

**Example:**
- If 300 units sold in last 30 days → Sales Velocity = 10 units/day

### 2. Stock Depletion Prediction

Based on current stock and sales velocity, the system predicts **days until stockout**:

```typescript
Days Until Stockout = Current Stock / Sales Velocity
```

**Example:**
- Current Stock: 50 units
- Sales Velocity: 10 units/day
- Days Until Stockout = 50 / 10 = **5 days**

### 3. Priority Calculation

Recommendations are prioritized based on urgency:

| Priority | Condition | Action Required |
|----------|-----------|-----------------|
| **CRITICAL** | Stock < 10 units OR Days until stockout < 3 | Immediate reorder |
| **HIGH** | Stock < Reorder Point OR Days until stockout < 7 | Reorder soon |
| **MEDIUM** | Stock < Reorder Point + 20% buffer | Monitor closely |
| **LOW** | Stock adequate but declining | Continue monitoring |

### 4. Reorder Quantity Calculation

The system suggests optimal reorder quantities using a **30-day supply model with 20% safety buffer**:

```typescript
Base Quantity = Sales Velocity × 30 days
Safety Buffer = Base Quantity × 0.2 (20%)
Suggested Reorder = Base Quantity + Safety Buffer
```

**Example:**
- Sales Velocity: 10 units/day
- Base Quantity: 10 × 30 = 300 units
- Safety Buffer: 300 × 0.2 = 60 units
- **Suggested Reorder: 360 units**

**Constraints:**
- Cannot exceed available warehouse capacity: `Max Capacity - Current Stock`
- Minimum reorder equals reorder point if calculated value is too low

### 5. Confidence Scoring

Confidence levels indicate prediction reliability:

| Confidence | Calculation | Meaning |
|------------|-------------|---------|
| **90-100%** | High sales consistency (< 10% variance) | Very reliable |
| **70-89%** | Moderate sales consistency (10-30% variance) | Reliable |
| **50-69%** | Irregular sales patterns (> 30% variance) | Less reliable |
| **< 50%** | Insufficient data (< 10 events) | Use with caution |

```typescript
Confidence = 100% - (Sales Variance × 100%)
```

## Recommendation Types

### Critical Low Stock
```
Priority: CRITICAL
Trigger: Current Stock < 10 units
Action: "URGENT: Reorder immediately - critically low stock"
Reason: "Stock is critically low and may run out within hours"
```

### Approaching Stockout
```
Priority: HIGH
Trigger: Days Until Stockout < 7
Action: "Reorder [Product] - approaching stockout"
Reason: "At current sales rate, stock will deplete in X days"
```

### Below Reorder Point
```
Priority: HIGH
Trigger: Current Stock < Reorder Point
Action: "Reorder [Product] - below reorder threshold"
Reason: "Stock level has fallen below the reorder point"
```

### Declining Trend
```
Priority: LOW
Trigger: Stock adequate but declining
Action: "Monitor [Product] stock levels"
Reason: "Current stock is adequate but showing declining trend"
```

## Alert Integration

The AI system integrates with the alerting system to trigger automatic notifications:

| Alert Type | Trigger Condition | Severity |
|------------|-------------------|----------|
| **CRITICAL_LOW_STOCK** | Stock < 10 units | Critical |
| **LOW_STOCK** | Stock < Reorder Point | Warning |
| **RAPID_DEPLETION** | > 30% decrease in 1 hour | Warning |
| **OVERSTOCK** | Stock > 90% of capacity | Info |

## Caching Strategy

To optimize performance, recommendations are cached for **5 minutes**:

```typescript
Cache TTL: 5 minutes (300,000 ms)
Cache Key: "recommendations" + timestamp
```

**Benefits:**
- Reduces computation overhead
- Consistent recommendations across multiple API calls
- Fresh enough to respond to changing conditions

## Example Calculation

### Product: Wireless Mouse

**Input Data:**
- Current Stock: 150 units
- Max Capacity: 500 units
- Reorder Point: 100 units
- Last 30 days sales: 420 units

**Calculations:**

1. **Sales Velocity:**
   ```
   420 units / 30 days = 14 units/day
   ```

2. **Days Until Stockout:**
   ```
   150 units / 14 units/day = 10.7 days
   ```

3. **Priority:**
   ```
   Stock (150) > Reorder Point (100) → LOW priority
   Days Until Stockout (10.7) > 7 → Continue monitoring
   ```

4. **Reorder Quantity:**
   ```
   Base: 14 units/day × 30 days = 420 units
   Buffer: 420 × 0.2 = 84 units
   Total: 420 + 84 = 504 units

   Available Capacity: 500 - 150 = 350 units
   Suggested Reorder: min(504, 350) = 350 units
   ```

5. **Confidence:**
   ```
   Assuming 20% sales variance:
   Confidence = 100% - 20% = 80%
   ```

**Output:**
```json
{
  "productId": "PROD-002",
  "productName": "Wireless Mouse",
  "priority": "LOW",
  "action": "Monitor Wireless Mouse stock levels",
  "reason": "Current stock is adequate but showing declining trend. Continue monitoring.",
  "suggestedReorderQuantity": 350,
  "estimatedDaysUntilStockout": 10.7,
  "confidence": 0.80,
  "estimatedCost": 5250.00
}
```

## Limitations

1. **Historical Data Dependency:** Requires at least 10 events for reliable predictions
2. **Linear Projection:** Assumes constant sales velocity (doesn't account for seasonality)
3. **No External Factors:** Doesn't consider promotions, holidays, or market trends
4. **Rule-Based Logic:** Uses predefined thresholds rather than machine learning

## Future Enhancements

- **Seasonal Patterns:** Detect and account for seasonal demand variations
- **Machine Learning Models:** Implement time-series forecasting (ARIMA, LSTM)
- **External Data Integration:** Weather, holidays, competitor pricing
- **Multi-Warehouse Optimization:** Cross-warehouse inventory balancing
- **Demand Sensing:** Real-time demand signal processing
- **Gemini AI Integration:** Natural language insights and explanations

## API Endpoints

### Get All Recommendations
```http
GET /api/recommendations
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "productId": "PROD-001",
      "productName": "Laptop Pro",
      "priority": "HIGH",
      "recommendation": "Reorder Laptop Pro - below reorder threshold",
      "reasoning": "Stock level has fallen below the reorder point (50 < 100)",
      "suggestedReorderQuantity": 250,
      "estimatedDaysUntilStockout": 5,
      "confidence": 0.85,
      "generatedAt": "2025-11-04T18:30:00.000Z"
    }
  ],
  "count": 10,
  "cacheStats": {
    "cacheHits": 45,
    "cacheMisses": 3,
    "cacheAge": "2 minutes"
  }
}
```

### Get Product Recommendation
```http
GET /api/recommendations?productId=PROD-001
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "PROD-001",
    "productName": "Laptop Pro",
    "priority": "HIGH",
    "recommendation": "Reorder Laptop Pro - below reorder threshold",
    "reasoning": "Stock level has fallen below the reorder point",
    "suggestedReorderQuantity": 250,
    "estimatedDaysUntilStockout": 5,
    "confidence": 0.85
  }
}
```

## Monitoring & Metrics

The recommendation system tracks:
- **Cache Hit Rate:** Percentage of requests served from cache
- **Average Confidence:** Mean confidence across all recommendations
- **Priority Distribution:** Breakdown of recommendations by priority
- **Recommendation Accuracy:** Track actual vs. predicted stockouts (future)

---

**Built with** ❤️ **for intelligent inventory management**
