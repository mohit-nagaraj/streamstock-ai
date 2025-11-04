/**
 * Analyze seeded data to diagnose issues
 */

import { seedData } from './backend/src/utils/seed';
import { productStore, eventStore, alertStore } from './backend/src/stores/InMemoryStore';
import { generateForecasts } from './backend/src/services/Forecasting';
import { generateRecommendations } from './backend/src/services/AIRecommendations';

async function analyzeData() {
  console.log('🔍 Running data analysis...\n');

  // Seed the data
  await seedData();

  // Get all data
  const products = productStore.getAll();
  const events = eventStore.getAll();
  const alerts = alertStore.getAll();

  console.log('\n' + '='.repeat(60));
  console.log('📊 DETAILED DATA ANALYSIS');
  console.log('='.repeat(60));

  // Analyze events
  console.log('\n📈 EVENT ANALYSIS:');
  const sales = events.filter(e => e.type === 'SALE');
  const restocks = events.filter(e => e.type === 'RESTOCK');
  const returns = events.filter(e => e.type === 'RETURN');

  const totalSalesQty = sales.reduce((sum, e) => sum + e.quantity, 0);
  const totalRestockQty = restocks.reduce((sum, e) => sum + e.quantity, 0);
  const totalReturnQty = returns.reduce((sum, e) => sum + e.quantity, 0);

  console.log(`  Total Events: ${events.length}`);
  console.log(`  Sales: ${sales.length} events, ${totalSalesQty} units sold`);
  console.log(`  Restocks: ${restocks.length} events, ${totalRestockQty} units added`);
  console.log(`  Returns: ${returns.length} events, ${totalReturnQty} units returned`);
  console.log(`  Net Stock Change: ${totalRestockQty + totalReturnQty - totalSalesQty} units`);

  // Analyze product stock levels
  console.log('\n📦 PRODUCT STOCK ANALYSIS:');
  products.forEach(p => {
    const productEvents = events.filter(e => e.productId === p.id);
    const productSales = productEvents.filter(e => e.type === 'SALE');
    const totalSold = productSales.reduce((sum, e) => sum + e.quantity, 0);
    const stockHealth = (p.currentStock / p.maxCapacity * 100).toFixed(1);

    console.log(`  ${p.name}:`);
    console.log(`    Current: ${p.currentStock} | Reorder: ${p.reorderPoint} | Max: ${p.maxCapacity}`);
    console.log(`    Stock Health: ${stockHealth}% | Sales: ${totalSold} units over 30 days`);
  });

  // Generate and analyze forecasts
  console.log('\n🔮 FORECAST ANALYSIS:');
  const forecasts = generateForecasts(products, events, 7);

  forecasts.forEach(f => {
    console.log(`  ${f.productName}:`);
    console.log(`    Current Stock: ${f.currentStock}`);
    console.log(`    Predicted Stock (7d): ${f.predictedStock7d}`);
    console.log(`    Confidence: ${(f.confidence * 100).toFixed(1)}%`);
    console.log(`    Reorder Recommended: ${f.reorderRecommended ? 'YES' : 'NO'}`);
  });

  const avgConfidence = forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length;
  console.log(`\n  📊 Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

  // Analyze confidence calculation
  console.log('\n🔬 CONFIDENCE CALCULATION BREAKDOWN:');
  products.forEach(p => {
    const productEvents = events.filter(e => e.productId === p.id);

    // Calculate daily changes
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailyChanges: Map<string, number> = new Map();

    productEvents.forEach(event => {
      const eventDate = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
      if (eventDate >= thirtyDaysAgo) {
        const dayKey = eventDate.toISOString().split('T')[0];
        const currentChange = dailyChanges.get(dayKey) || 0;

        let change = 0;
        if (event.type === 'SALE') change = -event.quantity;
        else if (event.type === 'RESTOCK' || event.type === 'RETURN') change = event.quantity;

        dailyChanges.set(dayKey, currentChange + change);
      }
    });

    const values = Array.from(dailyChanges.values());
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean !== 0 ? Math.abs(stdDev / mean) : 1;
    const confidence = Math.max(0.1, Math.min(0.95, 1 - coefficientOfVariation));

    console.log(`  ${p.name}:`);
    console.log(`    Daily Changes: ${values.length} days`);
    console.log(`    Mean Change: ${mean.toFixed(2)} units/day`);
    console.log(`    Std Dev: ${stdDev.toFixed(2)}`);
    console.log(`    Coefficient of Variation: ${coefficientOfVariation.toFixed(2)}`);
    console.log(`    Confidence: ${(confidence * 100).toFixed(1)}%`);
  });

  // Generate and analyze recommendations
  console.log('\n💡 AI RECOMMENDATIONS ANALYSIS:');
  const recommendations = generateRecommendations(products, events, alerts);

  console.log(`  Total Recommendations: ${recommendations.length}`);
  console.log(`  Critical: ${recommendations.filter(r => r.priority === 'critical').length}`);
  console.log(`  High: ${recommendations.filter(r => r.priority === 'high').length}`);
  console.log(`  Medium: ${recommendations.filter(r => r.priority === 'medium').length}`);
  console.log(`  Low: ${recommendations.filter(r => r.priority === 'low').length}`);

  if (recommendations.length > 0) {
    console.log('\n  Sample Recommendations:');
    recommendations.slice(0, 3).forEach(r => {
      console.log(`    - [${r.priority.toUpperCase()}] ${r.recommendation}`);
      console.log(`      Reason: ${r.reasoning}`);
    });
  }

  // Analyze alerts
  console.log('\n🚨 ALERT ANALYSIS:');
  const activeAlerts = alerts.filter(a => !a.resolved);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

  console.log(`  Total Alerts: ${alerts.length}`);
  console.log(`  Active Alerts: ${activeAlerts.length}`);
  console.log(`  Critical Alerts: ${criticalAlerts.length}`);

  const alertsBySeverity = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };

  console.log(`  By Severity: Critical: ${alertsBySeverity.critical}, Warning: ${alertsBySeverity.warning}, Info: ${alertsBySeverity.info}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Analysis complete!\n');
}

analyzeData().catch(console.error);
