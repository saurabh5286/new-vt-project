export class Chunker {
  static chunk(text: string, chunkSize = 800, overlap = 150): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let i = 0;

    while (i < words.length) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
      i += chunkSize - overlap;
    }

    return chunks;
  }
}
