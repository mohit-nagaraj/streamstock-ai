/**
 * Test Kafka Producer
 * Quick script to verify Kafka connection and event sending
 */

import { initProducer, sendEvent, disconnectProducer } from './kafka/producer';
import { v4 as uuidv4 } from 'uuid';
import { Event } from './models/types';

async function testProducer() {
  console.log('🧪 Testing Kafka Producer...\n');

  try {
    // Initialize producer
    await initProducer();

    // Create test event
    const testEvent: Event = {
      id: uuidv4(),
      type: 'SALE',
      productId: 'TEST-001',
      quantity: 5,
      warehouse: 'Test Warehouse',
      timestamp: new Date(),
      metadata: { test: true },
    };

    console.log('📤 Sending test event:', testEvent);

    // Send event
    await sendEvent(testEvent);

    console.log('\n✅ Test successful! Kafka producer is working.');

    // Disconnect
    await disconnectProducer();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testProducer();
