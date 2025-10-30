/**
 * Kafka Consumer for StreamStock AI
 * Processes inventory events and updates system state
 */

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Event } from '../models/types';
import { eventHandler } from '../services/EventHandler';

// Kafka configuration
const kafka = new Kafka({
  clientId: 'streamstock-consumer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    retries: 5,
    initialRetryTime: 300,
  },
});

let consumer: Consumer | null = null;

/**
 * Initialize Kafka consumer
 */
export async function initConsumer(): Promise<Consumer> {
  if (consumer) return consumer;

  consumer = kafka.consumer({
    groupId: 'streamstock-inventory-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });

  await consumer.connect();
  console.log('✅ Kafka Consumer connected');

  // Subscribe to all inventory topics
  await consumer.subscribe({
    topics: [
      'inventory.sales',
      'inventory.restocks',
      'inventory.returns',
      'inventory.alerts',
    ],
    fromBeginning: false, // Only process new messages
  });

  console.log('✅ Subscribed to inventory topics');

  return consumer;
}

/**
 * Start consuming messages
 */
export async function startConsuming(): Promise<void> {
  if (!consumer) {
    throw new Error('Consumer not initialized. Call initConsumer() first.');
  }

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      await processMessage(payload);
    },
  });

  console.log('🎧 Consumer is now listening for events...');
}

/**
 * Process individual message
 */
async function processMessage(payload: EachMessagePayload): Promise<void> {
  const { topic, partition, message } = payload;

  try {
    // Parse message
    const event: Event = JSON.parse(message.value?.toString() || '{}');

    console.log(
      `📥 [${topic}] Received: ${event.type} - ${event.productId} (${event.quantity} units)`
    );

    // Process event through event handler
    await eventHandler.processEvent(event);

    // Additional topic-specific processing
    switch (topic) {
      case 'inventory.sales':
        await processSaleEvent(event);
        break;
      case 'inventory.restocks':
        await processRestockEvent(event);
        break;
      case 'inventory.returns':
        await processReturnEvent(event);
        break;
      case 'inventory.alerts':
        await processAlertEvent(event);
        break;
    }
  } catch (error) {
    console.error(`❌ Error processing message from ${topic}:`, error);
    // In production, you might want to send to a dead letter queue
  }
}

/**
 * Process sale event
 */
async function processSaleEvent(event: Event): Promise<void> {
  // Sale-specific logic could go here
  // For now, handled by eventHandler.processEvent
}

/**
 * Process restock event
 */
async function processRestockEvent(event: Event): Promise<void> {
  // Restock-specific logic
  console.log(`   ✅ Stock replenished: ${event.quantity} units`);
}

/**
 * Process return event
 */
async function processReturnEvent(event: Event): Promise<void> {
  // Return-specific logic
  console.log(`   ↩️  Return processed: ${event.quantity} units`);
}

/**
 * Process alert event
 */
async function processAlertEvent(event: Event): Promise<void> {
  // Alert-specific logic
  console.log(`   🚨 Alert event processed`);
}

/**
 * Stop consuming messages
 */
export async function stopConsuming(): Promise<void> {
  if (consumer) {
    await consumer.stop();
    console.log('⏸️  Consumer stopped');
  }
}

/**
 * Disconnect consumer
 */
export async function disconnectConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    console.log('✅ Kafka Consumer disconnected');
  }
}

/**
 * Get consumer instance (for testing)
 */
export function getConsumer(): Consumer | null {
  return consumer;
}
