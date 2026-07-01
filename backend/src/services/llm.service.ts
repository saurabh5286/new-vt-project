import { Ollama } from 'ollama';
import { VectorService } from './vector.service';
import { v4 as uuidv4 } from 'uuid';

const ollama = new Ollama({ host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434' });
console.log('[LLMService] OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL || 'http://localhost:11434');

const CHAT_MODEL = 'llama3';
const EMBED_MODEL = 'nomic-embed-text';

export class LLMService {
  static async getEmbedding(text: string): Promise<number[]> {
    try {
      const result = await ollama.embed({ model: EMBED_MODEL, input: text });
      return result.embeddings[0];
    } catch (err) {
      console.error('[LLMService] Embedding generation failed:', err);
      throw err; // propagate to caller so generateAnswer can handle it
    }
  }

  static async processAndStoreChunks(workspaceId: string, chunks: { text: string; metadata: any }[]) {
    const vectors = [];
    for (const chunk of chunks) {
      const vector = await this.getEmbedding(chunk.text);
      vectors.push({
        id: uuidv4(),
        values: vector,
        metadata: { ...chunk.metadata, text: chunk.text }
      });
    }
    await VectorService.upsertVectors(workspaceId, vectors);
  }

  // Simple in‑memory cache for recent answers (workspaceId+question → answer)
  private static answerCache: Map<string, { answer: string; citations: any[] }> = new Map();

  static async generateAnswer(workspaceId: string, question: string) {
    console.time('[LLMService] generateAnswer');
    const cacheKey = `${workspaceId}::${question}`;
    // Return cached answer if available
    const cached = LLMService.answerCache.get(cacheKey);
    if (cached) {
      console.timeEnd('[LLMService] generateAnswer');
      console.log('[LLMService] Returned cached answer');
      return cached;
    }

    // 1. Create embeddings for the query
    const queryVector = await this.getEmbedding(question);
    console.timeEnd('[LLMService] generateAnswer');
    console.time('[LLMService] vectorSearch');
    // 2. Search Qdrant for context (reduce topK to 3 for speed) with timeout
    let matches: any[] = [];
    try {
      matches = await Promise.race([
        VectorService.queryVectors(workspaceId, queryVector, 3),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Vector search timeout')), 3000)),
      ]);
    } catch (err) {
      console.warn('[LLMService] Vector search failed or timed out:', err);
    }
    console.timeEnd('[LLMService] vectorSearch');

    if (!matches || matches.length === 0) {
      console.warn('[LLMService] No context vectors found, falling back to direct LLM response');
      // Directly ask the model without context
      try {
        const fallbackResponse = await ollama.chat({
          model: CHAT_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful assistant for DocuMind AI. Answer the question directly. If you do not know the answer, respond with "I do not know."' },
            { role: 'user', content: question },
          ],
        });
        const result = {
          answer: fallbackResponse.message.content,
          citations: [],
        };
        LLMService.answerCache.set(cacheKey, result);
        return result;
      } catch (err) {
        console.error('[LLMService] Ollama fallback failed:', err);
        const fallback = { answer: 'Sorry, I could not generate a response at this time.', citations: [] };
        LLMService.answerCache.set(cacheKey, fallback);
        return fallback;
      }
    }


    const context = matches.map((m: any) => m.metadata?.text || '').join('\n\n');
    // 3. Formulate Prompt and call Ollama with timeout
    const ollamaStart = Date.now();
    let response;
    try {
      response = await Promise.race([
        ollama.chat({
          model: CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant for DocuMind AI. Answer the question directly using the provided context. If the context does not contain the answer, respond with "I do not know."',
            },
            {
              role: 'user',
              content: `Context:\n${context}\n\nQuestion: ${question}`
            }
          ]
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Ollama chat timeout')), 30000))
      ]);
    } catch (err) {
      console.warn('[LLMService] Ollama chat failed or timed out:', err);
      // Fallback: ask the model directly without context
      try {
        const fallbackResponse = await ollama.chat({
          model: CHAT_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful assistant for DocuMind AI.' },
            { role: 'user', content: question }
          ]
        });
        const result = { answer: fallbackResponse.message.content, citations: [] };
        LLMService.answerCache.set(cacheKey, result);
        return result;
      } catch (fallbackErr) {
        console.error('[LLMService] Ollama fallback also failed:', fallbackErr);
        const fallback = { answer: 'Sorry, I could not generate a response at this time.', citations: [] };
        LLMService.answerCache.set(cacheKey, fallback);
        return fallback;
      }
    }
    console.log(`[LLMService] ollamaChat duration: ${Date.now() - ollamaStart}ms`);
    const result = {
      answer: response.message.content,
      citations: matches.map((m: any) => m.metadata),
    };
    // Cache the result for future identical queries
    LLMService.answerCache.set(cacheKey, result);
    return result;
  }
}
