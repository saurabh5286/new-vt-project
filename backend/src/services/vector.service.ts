import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

// For Qdrant, a "collection" maps to a workspace.
export class VectorService {
  // In-memory cache of collections that have been verified/created
  private static knownCollections: Set<string> = new Set();

  static async upsertVectors(workspaceId: string, vectors: any[]) {
    try {
      // Ensure collection exists only once per workspace
      if (!VectorService.knownCollections.has(workspaceId)) {
        const collectionsResponse = await qdrant.getCollections();
        const exists = collectionsResponse.collections.some((c: any) => c.name === workspaceId);
        if (!exists) {
          await qdrant.createCollection(workspaceId, {
            vectors: { size: 768, distance: 'Cosine' }, // nomic-embed-text uses 768 dims
          });
        }
        VectorService.knownCollections.add(workspaceId);
      }

      console.log(`[VectorService] Upserting ${vectors.length} vectors for workspace ${workspaceId}`);
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await qdrant.upsert(workspaceId, {
          wait: true,
          points: batch.map(v => ({
            id: v.id,
            vector: v.values,
            payload: v.metadata,
          })),
        });
        console.log(`[VectorService] Upserted batch ${i / batchSize + 1}`);
      }
    } catch (error) {
      console.error('[VectorService] Upsert Error:', error);
      throw error;
    }
  }

  static async queryVectors(workspaceId: string, queryVector: number[], topK: number = 8) {
    try {
      const results = await qdrant.search(workspaceId, {
        vector: queryVector,
        limit: topK,
        with_payload: true,
      });
      return results.map((r: any) => ({ ...r, metadata: r.payload }));
    } catch (error) {
      // If the collection does not exist, create it and retry the search
      const errMsg = (error as any)?.data?.status?.error || '';
      if (errMsg.includes("doesn't exist")) {
        console.warn('[VectorService] Collection not found, creating collection:', workspaceId);
        await qdrant.createCollection(workspaceId, { vectors: { size: 768, distance: 'Cosine' } });
        // Retry the search after creating the collection
        const retryResults = await qdrant.search(workspaceId, {
          vector: queryVector,
          limit: topK,
          with_payload: true,
        });
        return retryResults.map((r: any) => ({ ...r, metadata: r.payload }));
      }
      console.error('[VectorService] Query Error:', error);
      throw error;
    }
  }
}
