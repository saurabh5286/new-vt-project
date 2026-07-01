import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';

export const documentQueue = new Queue('document-processing', {
  // @ts-ignore Ignore type discrepancy between bullmq and ioredis
  connection: redisConnection
});

const documentWorker = new Worker('document-processing', async (job: Job) => {
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
}, { connection: redisConnection });

documentWorker.on('completed', (job: Job) => {
  console.log(`Job completed: ${job.id}`);
});

documentWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`Job failed: ${job?.id} with error: ${err.message}`);
});
