/**
 * Kafka Producer for StreamStock AI
 * Sends inventory events to Kafka topics
 */

import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { Event } from '../models/types';

// Kafka configuration
const kafka = new Kafka({
  clientId: 'streamstock-producer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    retries: 5,
    initialRetryTime: 300,
  },
});

// Create producer instance
let producer: Producer | null = null;

/**
 * Initialize Kafka producer
 */
export async function initProducer(): Promise<Producer> {
  if (producer) return producer;

  producer = kafka.producer({
    allowAutoTopicCreation: true,
    transactionTimeout: 30000,
  });

  await producer.connect();
  console.log('✅ Kafka Producer connected');
  return producer;
}

/**
 * Send event to Kafka topic
 */
export async function sendEvent(event: Event): Promise<void> {
  if (!producer) {
    throw new Error('Producer not initialized. Call initProducer() first.');
  }

  // Determine topic based on event type
  const topic = getTopicForEventType(event.type);

  const message: ProducerRecord = {
    topic,
    messages: [
      {
        key: event.productId, // Partition by product ID
        value: JSON.stringify(event),
        timestamp: event.timestamp.getTime().toString(),
      },
    ],
  };

  try {
    await producer.send(message);
    console.log(`📤 Event sent to ${topic}: ${event.type} - ${event.productId}`);
  } catch (error) {
    console.error(`❌ Failed to send event to ${topic}:`, error);
    throw error;
  }
}

/**
 * Send multiple events in a batch
 */
export async function sendEventBatch(events: Event[]): Promise<void> {
  if (!producer) {
    throw new Error('Producer not initialized. Call initProducer() first.');
  }

  // Group events by topic
  const eventsByTopic: Record<string, Event[]> = {};

  events.forEach((event) => {
    const topic = getTopicForEventType(event.type);
    if (!eventsByTopic[topic]) {
      eventsByTopic[topic] = [];
    }
    eventsByTopic[topic].push(event);
  });

  // Send to each topic
  const promises = Object.entries(eventsByTopic).map(async ([topic, topicEvents]) => {
    const messages = topicEvents.map((event) => ({
      key: event.productId,
      value: JSON.stringify(event),
      timestamp: event.timestamp.getTime().toString(),
    }));

    await producer!.send({ topic, messages });
    console.log(`📤 Batch sent to ${topic}: ${messages.length} events`);
  });

  await Promise.all(promises);
}

/**
 * Get Kafka topic for event type
 */
function getTopicForEventType(eventType: Event['type']): string {
  switch (eventType) {
    case 'SALE':
      return 'inventory.sales';
    case 'RESTOCK':
      return 'inventory.restocks';
    case 'RETURN':
      return 'inventory.returns';
    case 'ALERT':
      return 'inventory.alerts';
    default:
      return 'inventory.events';
  }
}

/**
 * Disconnect producer
 */
export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
    console.log('✅ Kafka Producer disconnected');
  }
}

/**
 * Get producer instance (for testing)
 */
export function getProducer(): Producer | null {
  return producer;
}
