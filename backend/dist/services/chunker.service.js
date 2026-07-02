"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chunker = void 0;
class Chunker {
    static chunk(text, chunkSize = 800, overlap = 150) {
        const words = text.split(/\s+/);
        const chunks = [];
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
exports.Chunker = Chunker;
