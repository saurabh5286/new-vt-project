"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URI = process.env.REDIS_URI || 'redis://localhost:6379';
exports.redisConnection = new ioredis_1.default(REDIS_URI, {
    maxRetriesPerRequest: null,
});
exports.redisConnection.on('error', (err) => {
    console.error('[Redis Error]:', err.message);
});
exports.redisConnection.on('connect', () => {
    console.log('Connected to Redis');
});
