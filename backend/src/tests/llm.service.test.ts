import { LLMService } from '../../src/services/llm.service';
import { Ollama } from 'ollama';
import { VectorService } from '../../src/services/vector.service';

jest.mock('ollama');
jest.mock('../../src/services/vector.service');

const mockedOllama = Ollama as jest.MockedClass<typeof Ollama>;
const mockedVectorService = VectorService as jest.Mocked<typeof VectorService>;

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
    const result = await LLMService.generateAnswer('workspace123', 'What is DocuMind?');
    expect(result).toHaveProperty('answer');
    expect(result).toHaveProperty('citations');
    expect(Array.isArray(result.citations)).toBe(true);
    expect(mockedOllama.prototype.embed).toHaveBeenCalled();
    expect(mockedVectorService.queryVectors).toHaveBeenCalledWith('workspace123', expect.any(Array), 8);
  });
});
