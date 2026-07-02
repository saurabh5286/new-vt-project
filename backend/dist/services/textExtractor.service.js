"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextExtractor = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
class TextExtractor {
    static async extract(filePath, mimeType) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        if (ext === '.pdf' || mimeType === 'application/pdf') {
            const buffer = fs_1.default.readFileSync(filePath);
            const data = await (0, pdf_parse_1.default)(buffer);
            return this.normalizeText(data.text || '');
        }
        if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth_1.default.extractRawText({ path: filePath });
            return this.normalizeText(result.value || '');
        }
        if (ext === '.pptx' || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            return this.normalizeText(fs_1.default.readFileSync(filePath, 'utf-8'));
        }
        if (ext === '.txt' || ext === '.md' || ext === '.csv' || mimeType.startsWith('text/')) {
            return this.normalizeText(fs_1.default.readFileSync(filePath, 'utf-8'));
        }
        throw new Error(`Unsupported file type: ${ext}`);
    }
    static normalizeText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}
exports.TextExtractor = TextExtractor;
