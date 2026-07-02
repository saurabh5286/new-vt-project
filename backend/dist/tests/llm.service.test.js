"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const llm_service_1 = require("../../src/services/llm.service");
const ollama_1 = require("ollama");
const vector_service_1 = require("../../src/services/vector.service");
jest.mock('ollama');
jest.mock('../../src/services/vector.service');
const mockedOllama = ollama_1.Ollama;
const mockedVectorService = vector_service_1.VectorService;
describe('LLMService integration test (mocked)', () => {
    beforeAll(() => {
        // Mock embed call
        mockedOllama.prototype.embed = jest.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] });
        // Mock vector query
        mockedVectorService.queryVectors = jest.fn().mockResolvedValue([
            { metadata: { text: 'sample context', documentId: 'doc1' } },
        ]);
    });
    it('should generate answer using mocked Ollama and vector service', async () => {
        const result = await llm_service_1.LLMService.generateAnswer('workspace123', 'What is DocuMind?');
        expect(result).toHaveProperty('answer');
        expect(result).toHaveProperty('citations');
        expect(Array.isArray(result.citations)).toBe(true);
        expect(mockedOllama.prototype.embed).toHaveBeenCalled();
        expect(mockedVectorService.queryVectors).toHaveBeenCalledWith('workspace123', expect.any(Array), 8);
    });
    it('should answer from workspace context immediately when available', async () => {
        mockedVectorService.queryVectors = jest.fn().mockResolvedValue([]);
        mockedOllama.prototype.chat = jest.fn().mockResolvedValue({ message: { content: 'Answer from uploaded document' } });
        llm_service_1.LLMService.storeWorkspaceContext('workspace123', 'The uploaded document says the answer is 42.');
        const result = await llm_service_1.LLMService.generateAnswer('workspace123', 'What does the document say?');
        expect(result.answer).toBe('Answer from uploaded document');
        expect(mockedVectorService.queryVectors).not.toHaveBeenCalled();
    });
});
