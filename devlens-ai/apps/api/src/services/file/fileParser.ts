import * as mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: 'code' | 'image' | 'document' | 'data' | 'unsupported';
  extractedText?: string;
  isSupported: boolean;
  unsupportedReason?: string;
}

const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs',
  'php', 'rb', 'swift', 'kt', 'html', 'css', 'scss', 'sql', 'sh', 'bash',
  'r', 'dart', 'lua', 'vue', 'svelte', 'toml', 'ini', 'conf'
]);

const DATA_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'csv', 'xml', 'md', 'txt', 'log', 'env']);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg']);

const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);

const MAX_TEXT_SIZE = 500 * 1024; // 500KB max for text extraction

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function detectType(filename: string, mimeType: string): ParsedFile['type'] {
  const ext = getExtension(filename);
  if (IMAGE_EXTENSIONS.has(ext) || mimeType.startsWith('image/')) return 'image';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (DATA_EXTENSIONS.has(ext)) return 'data';
  if (DOCUMENT_EXTENSIONS.has(ext)) return 'document';
  if (mimeType.startsWith('text/')) return 'code';
  if (mimeType.includes('json') || mimeType.includes('xml')) return 'data';
  return 'unsupported';
}

function validateMime(filename: string, declaredMime: string, buffer: Buffer): boolean {
  // Basic magic bytes check for common types
  const ext = getExtension(filename);

  // Check for image magic bytes
  if (ext === 'png' && buffer.slice(0, 4).toString('hex') !== '89504e47') return false;
  if (ext === 'jpg' || ext === 'jpeg') {
    const jpeg = buffer.slice(0, 2).toString('hex');
    if (jpeg !== 'ffd8') return false;
  }

  // For text files, check that mime matches extension
  const expectedMime = mime.lookup(filename);
  if (expectedMime && !declaredMime.includes(expectedMime.split('/')[0])) {
    if (!declaredMime.startsWith('text/') && !declaredMime.startsWith('application/')) return false;
  }

  return true;
}

export function parseFile(
  originalName: string,
  mimeType: string,
  size: number,
  buffer: Buffer
): ParsedFile {
  const id = uuidv4();
  const type = detectType(originalName, mimeType);

  // Validate MIME type matches file content
  if (!validateMime(originalName, mimeType, buffer)) {
    return {
      id,
      originalName,
      mimeType,
      size,
      type: 'unsupported',
      isSupported: false,
      unsupportedReason: 'File content does not match the declared file type.'
    };
  }

  // Extract text for supported types
  let extractedText: string | undefined;

  if ((type === 'code' || type === 'data') && size <= MAX_TEXT_SIZE) {
    try {
      extractedText = buffer.toString('utf-8');
    } catch {
      extractedText = undefined;
    }
  }

  if (type === 'document') {
    return {
      id,
      originalName,
      mimeType,
      size,
      type,
      isSupported: false,
      unsupportedReason: 'PDF and Office documents require additional processing. Text extraction for these formats will be available soon.'
    };
  }

  return {
    id,
    originalName,
    mimeType,
    size,
    type,
    extractedText,
    isSupported: type !== 'unsupported'
  };
}
