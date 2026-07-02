"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chunker = void 0;
class Chunker {
    static chunk(text, chunkSize = 1000, overlap = 180) {
        const normalized = text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        if (!normalized)
            return [];
        const sections = normalized
            .split(/\n\s*\n/)
            .map(section => section.trim())
            .filter(section => section.length > 20);
        if (sections.length === 0) {
            return normalized.match(/.{1,1400}/g)?.map(part => part.trim()).filter(Boolean) || [];
        }
        const chunks = [];
        let current = '';
        for (const section of sections) {
            const candidate = current ? `${current}\n\n${section}` : section;
            if (candidate.length <= chunkSize) {
                current = candidate;
            }
            else {
                if (current)
                    chunks.push(current.trim());
                current = section;
            }
        }
        if (current)
            chunks.push(current.trim());
        return chunks.map(chunk => chunk.replace(/\s+/g, ' ').trim()).filter(Boolean);
    }
}
exports.Chunker = Chunker;
