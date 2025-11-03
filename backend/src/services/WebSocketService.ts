import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Event, Product, Alert } from '../models/types';

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ['http://localhost:3001', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 WebSocket client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to StreamStock AI WebSocket',
      timestamp: new Date().toISOString(),
    });
  });

  console.log('🚀 WebSocket server initialized');

  return io;
}

export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast a new event to all connected clients
 */
export function broadcastEvent(event: Event): void {
  if (!io) return;

  io.emit('event:new', event);
  console.log(`📡 Broadcasting event: ${event.type} - ${event.productId}`);
}

/**
 * Broadcast product update to all connected clients
 */
export function broadcastProductUpdate(product: Product): void {
  if (!io) return;

  io.emit('product:update', product);
  console.log(`📡 Broadcasting product update: ${product.id}`);
}

/**
 * Broadcast new alert to all connected clients
 */
export function broadcastAlert(alert: Alert): void {
  if (!io) return;

  io.emit('alert:new', alert);
  console.log(`📡 Broadcasting alert: ${alert.type} - ${alert.productId}`);
}

/**
 * Broadcast alert resolution to all connected clients
 */
export function broadcastAlertResolution(alertId: string): void {
  if (!io) return;

  io.emit('alert:resolved', { alertId, timestamp: new Date().toISOString() });
  console.log(`📡 Broadcasting alert resolution: ${alertId}`);
}

/**
 * Broadcast metrics update to all connected clients
 */
export function broadcastMetricsUpdate(metrics: any): void {
  if (!io) return;

  io.emit('metrics:update', metrics);
  console.log(`📡 Broadcasting metrics update`);
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): { connectedClients: number } {
  if (!io) {
    return { connectedClients: 0 };
  }

  return {
    connectedClients: io.engine.clientsCount,
  };
}
