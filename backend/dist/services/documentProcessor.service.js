"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessor = void 0;
const textExtractor_service_1 = require("./textExtractor.service");
const chunker_service_1 = require("./chunker.service");
const llm_service_1 = require("./llm.service");
const Document_1 = require("../models/Document");
class DocumentProcessor {
    static async process(documentId, filePath, mimeType, workspaceId, filename) {
        try {
            // 1. Update status to Processing
            await Document_1.DocumentModel.findByIdAndUpdate(documentId, { status: 'Processing' });
            // 2. Extract text
            const text = await textExtractor_service_1.TextExtractor.extract(filePath, mimeType);
            if (!text || text.trim().length === 0) {
                await Document_1.DocumentModel.findByIdAndUpdate(documentId, { status: 'Failed' });
                console.error(`[DocProcessor] No text extracted from ${filename}`);
                return;
            }
            // 3. Update status to GeneratingEmbeddings
            await Document_1.DocumentModel.findByIdAndUpdate(documentId, { status: 'GeneratingEmbeddings' });
            // 4. Chunk text
            const chunks = chunker_service_1.Chunker.chunk(text);
            const chunksWithMeta = chunks.map((chunkText, i) => ({
                text: chunkText,
                metadata: {
                    documentId,
                    workspaceId,
                    filename,
                    chunkIndex: i,
                }
            }));
            llm_service_1.LLMService.storeWorkspaceContext(workspaceId, text, { documentId, filename, chunkCount: chunks.length });
            // 5. Embed and store in Qdrant
            await llm_service_1.LLMService.processAndStoreChunks(workspaceId, chunksWithMeta);
            // 6. Mark as completed
            await Document_1.DocumentModel.findByIdAndUpdate(documentId, { status: 'Completed' });
            console.log(`[DocProcessor] ✅ ${filename} processed (${chunks.length} chunks)`);
        }
        catch (err) {
            console.error(`[DocProcessor] ❌ Failed: ${err.message}`);
            await Document_1.DocumentModel.findByIdAndUpdate(documentId, { status: 'Failed' });
        }
    }
}
exports.DocumentProcessor = DocumentProcessor;
