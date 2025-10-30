/**
 * StreamStock AI Backend Entry Point
 * Event-driven inventory management system
 */

import { initProducer, disconnectProducer } from './kafka/producer';
import { initConsumer, startConsuming, disconnectConsumer } from './kafka/consumer';
import { startEventGenerator, stopEventGenerator } from './kafka/eventGenerator';
import { seedData } from './utils/seed';

async function main() {
  console.log('\n🚀 StreamStock AI Backend Starting...\n');

  try {
    // 1. Seed initial data
    await seedData();

    // 2. Initialize Kafka infrastructure
    await initProducer();
    await initConsumer();

    // 3. Start Kafka consumer (processes events)
    await startConsuming();

    // 4. Start event generator (10 events/minute)
    startEventGenerator({
      eventsPerMinute: 10,
      enabled: true,
    });

    console.log('\n✅ StreamStock AI Backend is running!');
    console.log('📊 Full event-driven architecture active:');
    console.log('   - Producer: Generating events');
    console.log('   - Consumer: Processing events');
    console.log('   - Event Handler: Managing alerts\n');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n⏹️  Shutting down gracefully...');
      stopEventGenerator();
      await disconnectConsumer();
      await disconnectProducer();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n⏹️  Shutting down gracefully...');
      stopEventGenerator();
      await disconnectConsumer();
      await disconnectProducer();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    process.exit(1);
  }
}

// Start the application
main();
