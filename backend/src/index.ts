/**
 * StreamStock AI Backend Entry Point
 * Event-driven inventory management system
 */

import express from 'express';
import cors from 'cors';
import { initProducer, disconnectProducer } from './kafka/producer';
import { initConsumer, startConsuming, disconnectConsumer } from './kafka/consumer';
import { startEventGenerator, stopEventGenerator } from './kafka/eventGenerator';
import { seedData } from './utils/seed';
import apiRoutes from './api/routes';

async function main() {
  console.log('\n🚀 StreamStock AI Backend Starting...\n');

  try {
    // 1. Initialize Express API server
    const app = express();
    const PORT = process.env.PORT || 4000;

    app.use(cors());
    app.use(express.json());
    app.use('/api', apiRoutes);

    const server = app.listen(PORT, () => {
      console.log(`✅ Express API server running on http://localhost:${PORT}`);
      console.log(`   API endpoints available at http://localhost:${PORT}/api\n`);
    });

    // 2. Seed initial data
    await seedData();

    // 3. Initialize Kafka infrastructure
    await initProducer();
    await initConsumer();

    // 4. Start Kafka consumer (processes events)
    await startConsuming();

    // 5. Start event generator (10 events/minute)
    startEventGenerator({
      eventsPerMinute: 10,
      enabled: true,
    });

    console.log('\n✅ StreamStock AI Backend is running!');
    console.log('📊 Full event-driven architecture active:');
    console.log('   - Express API: Serving HTTP endpoints');
    console.log('   - Producer: Generating events');
    console.log('   - Consumer: Processing events');
    console.log('   - Event Handler: Managing alerts\n');

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n\n⏹️  Shutting down gracefully...');
      stopEventGenerator();
      await disconnectConsumer();
      await disconnectProducer();
      server.close(() => {
        console.log('✅ Express server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    process.exit(1);
  }
}

// Start the application
main();
