"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
exports.documentQueue = new bullmq_1.Queue('document-processing', {
    // @ts-ignore Ignore type discrepancy between bullmq and ioredis
    connection: redis_1.redisConnection
});
const documentWorker = new bullmq_1.Worker('document-processing', async (job) => {
    console.log(`Processing document job: ${job.id}`);
    const { documentId, workspaceId, filename } = job.data;
    // Pipeline: 
    // 1. Fetch from S3
    // 2. Extract Text / OCR
    // 3. Generate Embeddings using LangChain/OpenAI
    // 4. Save to Vector Store (Pinecone)
    // 5. Update Status in DB
    return { status: 'processed', documentId };
    // @ts-ignore Ignore type discrepancy
}, { connection: redis_1.redisConnection });
documentWorker.on('completed', (job) => {
    console.log(`Job completed: ${job.id}`);
});
documentWorker.on('failed', (job, err) => {
    console.error(`Job failed: ${job?.id} with error: ${err.message}`);
});
