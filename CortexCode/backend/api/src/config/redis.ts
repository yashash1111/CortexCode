import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (times > 10) {
      return 5000;
    }
    return Math.min(times * 250, 3000);
  },
});

let lastErrorLog = 0;
connection.on('error', (err) => {
  const now = Date.now();
  if (now - lastErrorLog > 10000) {
    console.error('[Redis] Connection error:', err.message);
    lastErrorLog = now;
  }
});

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const res = await connection.ping();
    return res === 'PONG';
  } catch {
    return false;
  }
}
