import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared connection for BullMQ with silent retry strategy for standalone dev mode
export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy: () => null,
});

connection.on('error', () => {
  // Silent error handler when running local dev without active redis daemon
});

