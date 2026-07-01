import Redis from 'ioredis';

const REDIS_URI = process.env.REDIS_URI || 'redis://localhost:6379';

export const redisConnection = new Redis(REDIS_URI, {
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
  console.error('[Redis Error]:', err.message);
});

redisConnection.on('connect', () => {
  console.log('Connected to Redis');
});
