import { TextExtractor } from './textExtractor.service';
import { Chunker } from './chunker.service';
import { LLMService } from './llm.service';
import { DocumentModel } from '../models/Document';

export class DocumentProcessor {
  static async process(documentId: string, filePath: string, mimeType: string, workspaceId: string, filename: string) {
    try {
      // 1. Update status to Processing
      await DocumentModel.findByIdAndUpdate(documentId, { status: 'Processing' });

      // 2. Extract text
      const text = await TextExtractor.extract(filePath, mimeType);
      if (!text || text.trim().length === 0) {
        await DocumentModel.findByIdAndUpdate(documentId, { status: 'Failed' });
        console.error(`[DocProcessor] No text extracted from ${filename}`);
        return;
      }

      // 3. Update status to GeneratingEmbeddings
      await DocumentModel.findByIdAndUpdate(documentId, { status: 'GeneratingEmbeddings' });

      // 4. Chunk text
      const chunks = Chunker.chunk(text);
      const chunksWithMeta = chunks.map((chunkText, i) => ({
        text: chunkText,
        metadata: {
          documentId,
          workspaceId,
          filename,
          chunkIndex: i,
        }
      }));

      // 5. Embed and store in Qdrant
      await LLMService.processAndStoreChunks(workspaceId, chunksWithMeta);

      // 6. Mark as completed
      await DocumentModel.findByIdAndUpdate(documentId, { status: 'Completed' });
      console.log(`[DocProcessor] ✅ ${filename} processed (${chunks.length} chunks)`);
    } catch (err: any) {
      console.error(`[DocProcessor] ❌ Failed: ${err.message}`);
      await DocumentModel.findByIdAndUpdate(documentId, { status: 'Failed' });
    }
  }
}
