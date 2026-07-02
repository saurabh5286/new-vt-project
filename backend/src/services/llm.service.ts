import { Ollama } from 'ollama';
import { VectorService } from './vector.service';
import { TextExtractor } from './textExtractor.service';
import { DocumentModel } from '../models/Document';
import { v4 as uuidv4 } from 'uuid';

const ollama = new Ollama({ host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434' });
console.log('[LLMService] OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL || 'http://localhost:11434');

const CHAT_MODEL = 'llama3';
const EMBED_MODEL = 'nomic-embed-text';

export class LLMService {
  private static answerCache: Map<string, { answer: string; citations: any[] }> = new Map();
  private static workspaceContextCache: Map<string, Array<{ text: string; metadata: any; updatedAt: number }>> = new Map();
  private static readonly stopWords = new Set(['the','a','an','and','or','of','to','in','on','for','with','is','are','was','were','be','this','that','these','those','what','which','how','why','who','when','where','do','does','did','can','could','should','would','from','about','your','their','our','my','it','its','as','by','at','up','down','into','onto']);

  static storeWorkspaceContext(workspaceId: string, text: string, metadata?: any) {
    if (!text || !text.trim()) return;

    const entry = {
      text: text.trim(),
      metadata: metadata || {},
      updatedAt: Date.now(),
    };

    const existing = LLMService.workspaceContextCache.get(workspaceId) || [];
    const next = [entry, ...existing.filter(item => item.text !== entry.text)].slice(0, 5);
    LLMService.workspaceContextCache.set(workspaceId, next);
  }

  static async getWorkspaceContext(workspaceId: string): Promise<string | null> {
    const cached = LLMService.workspaceContextCache.get(workspaceId);
    if (cached && cached.length > 0) {
      return cached.map(item => item.text).join('\n\n');
    }

    try {
      const docs = await DocumentModel.find({ workspaceId, status: { $in: ['Processing', 'GeneratingEmbeddings', 'Completed'] } })
        .sort({ updatedAt: -1 })
        .limit(3)
        .select('originalUrl filename mimeType status');

      for (const doc of docs) {
        try {
          const text = await TextExtractor.extract(doc.originalUrl, doc.mimeType || '');
          if (text && text.trim()) {
            LLMService.storeWorkspaceContext(workspaceId, text, { documentId: doc._id, filename: doc.filename });
            return text;
          }
        } catch (err) {
          console.warn('[LLMService] Failed to load context from document:', doc.filename, err);
        }
      }
    } catch (err) {
      console.warn('[LLMService] Could not load workspace document context:', err);
    }

    return null;
  }

  private static isGeneralChatQuestion(question: string): boolean {
    const normalized = question.toLowerCase().trim();
    if (!normalized) return false;
    const greetings = ['hi', 'hello', 'hey', 'hii', 'hiii', 'how are you', 'what is your name', 'who are you', 'thanks', 'thank you', 'good morning', 'good evening', 'good night'];
    return greetings.some(greeting => normalized.includes(greeting)) || /^((hi|hello|hey|hii|hiii)(\s|!|\.)*)$/.test(normalized);
  }

  private static createFallbackAnswer(question: string, context: string) {
    if (this.isGeneralChatQuestion(question)) {
      const greetingReply = question.toLowerCase().includes('thanks') || question.toLowerCase().includes('thank you')
        ? 'You are welcome! I am here to help with your documents and questions.'
        : 'Hello! I can help answer questions about your uploaded documents and chat with you normally.';
      return { answer: greetingReply, citations: [] };
    }

    const normalizedQuestion = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const questionTokens = normalizedQuestion.split(/\s+/).filter(token => token.length > 2 && !LLMService.stopWords.has(token));

    const sentences = context
      .split(/(?<=[.!?])\s+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 10);

    const scored = sentences
      .map(sentence => {
        const normalizedSentence = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const sentenceTokens = normalizedSentence.split(/\s+/).filter(token => token.length > 2);
        const overlap = questionTokens.filter(token => sentenceTokens.includes(token)).length;
        return { sentence, overlap, length: sentence.length };
      })
      .filter(item => item.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || a.length - b.length);

    if (scored.length > 0) {
      const topSentence = scored[0].sentence;
      const answer = topSentence.length > 280 ? `${topSentence.slice(0, 277)}...` : topSentence;
      return {
        answer: `Based on the uploaded document, ${answer}`,
        citations: [{ text: topSentence.slice(0, 280) }],
      };
    }

    return {
      answer: 'I could not find a direct answer in the uploaded document yet. Please ask a more specific question or upload a clearer document.',
      citations: [],
    };
  }

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

    const quickContext = await this.getWorkspaceContext(workspaceId);
    if (quickContext) {
      console.log('[LLMService] Using uploaded document context for a fast answer');
      try {
        const response = await Promise.race([
          ollama.chat({
            model: CHAT_MODEL,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant for DocuMind AI. Answer the question directly using the provided context. Use the most relevant details from the uploaded document, preserve facts, and be specific. If the answer is not in the document, say so clearly.',
              },
              {
                role: 'user',
                content: `Context:\n${quickContext}\n\nQuestion: ${question}`,
              },
            ],
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Ollama chat timeout')), 10000)),
        ]);
        const result = {
          answer: response.message.content,
          citations: [{ text: quickContext.substring(0, 400) }],
        };
        LLMService.answerCache.set(cacheKey, result);
        return result;
      } catch (err) {
        console.warn('[LLMService] Fast context answer failed, using document-based fallback:', err);
        const fallback = this.createFallbackAnswer(question, quickContext);
        LLMService.answerCache.set(cacheKey, fallback);
        return fallback;
      }
    }

    // 1. Create embeddings for the query
    let queryVector: number[] = [];
    try {
      queryVector = await Promise.race([
        this.getEmbedding(question),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Embedding timeout')), 5000)),
      ]);
    } catch (err) {
      console.warn('[LLMService] Embedding generation failed or timed out:', err);
      const fallback = this.createFallbackAnswer(question, quickContext || '');
      LLMService.answerCache.set(cacheKey, fallback);
      return fallback;
    }

    console.timeEnd('[LLMService] generateAnswer');
    console.time('[LLMService] vectorSearch');
    // 2. Search Qdrant for context (reduce topK to 3 for speed) with timeout
    let matches: any[] = [];
    try {
      matches = await Promise.race([
        VectorService.queryVectors(workspaceId, queryVector, 3),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Vector search timeout')), 2000)),
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
            { role: 'system', content: 'You are a helpful assistant for DocuMind AI. Answer the question directly and conversationally. For greetings like hello, hi, hey, thank you, or how are you, respond warmly and briefly. If you do not know the answer, respond with "I do not know."' },
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
        const fallback = this.createFallbackAnswer(question, '');
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
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Ollama chat timeout')), 10000))
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
        const fallback = this.createFallbackAnswer(question, context);
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
