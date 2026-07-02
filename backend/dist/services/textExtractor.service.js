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
            return data.text;
        }
        if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth_1.default.extractRawText({ path: filePath });
            return result.value;
        }
        if (ext === '.txt' || ext === '.md' || ext === '.csv' || mimeType.startsWith('text/')) {
            return fs_1.default.readFileSync(filePath, 'utf-8');
        }
        throw new Error(`Unsupported file type: ${ext}`);
    }
}
exports.TextExtractor = TextExtractor;
