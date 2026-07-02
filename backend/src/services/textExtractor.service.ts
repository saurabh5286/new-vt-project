import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class TextExtractor {
  static async extract(filePath: string, mimeType: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return this.normalizeText(data.text || '');
    }

    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return this.normalizeText(result.value || '');
    }

    if (ext === '.pptx' || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return this.normalizeText(fs.readFileSync(filePath, 'utf-8'));
    }

    if (ext === '.txt' || ext === '.md' || ext === '.csv' || mimeType.startsWith('text/')) {
      return this.normalizeText(fs.readFileSync(filePath, 'utf-8'));
    }

    throw new Error(`Unsupported file type: ${ext}`);
  }

  private static normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
