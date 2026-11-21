// Shared types for file attachments across the chat system

export interface FolderFile {
  path: string;       // relative path like 'src/components/App.tsx'
  name: string;
  size: number;
  mimeType: string;
  type: 'code' | 'image' | 'audio' | 'document' | 'data' | 'unsupported';
  extractedText?: string;
  preview?: string;
}

export type FileType = 'code' | 'image' | 'audio' | 'document' | 'data' | 'folder' | 'unsupported';

export interface AttachedFile {
  id: string;
  file?: File;
  name: string;
  type: FileType;
  mimeType: string;
  size: number;
  preview?: string;           // base64 data URL for images
  audioUrl?: string;          // base64 or blob URL for audio
  extractedText?: string;     // text content for code/text files
  isFolder?: boolean;
  folderName?: string;
  folderContents?: FolderFile[];
  folderFileCount?: number;
}

// File type detection
const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs',
  'php', 'rb', 'swift', 'kt', 'html', 'css', 'scss', 'sass', 'less',
  'sql', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'r', 'dart', 'lua', 'vim',
  'toml', 'ini', 'conf', 'env', 'dockerfile', 'makefile', 'gradle'
]);

const DATA_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'csv', 'xml', 'md', 'txt', 'log', 'env']);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'ico', 'heic', 'avif']);

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm', 'opus', 'wma']);

const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt']);

// Folders to ignore during folder upload
export const IGNORED_FOLDERS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.cache',
  'coverage', '__pycache__', '.pytest_cache', 'venv', '.venv',
  'target', 'out', '.output', 'vendor', 'bower_components'
]);

export function detectFileType(filename: string, mimeType: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  if (IMAGE_EXTENSIONS.has(ext) || mimeType.startsWith('image/')) return 'image';
  if (AUDIO_EXTENSIONS.has(ext) || mimeType.startsWith('audio/')) return 'audio';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (DATA_EXTENSIONS.has(ext)) return 'data';
  if (DOCUMENT_EXTENSIONS.has(ext)) return 'document';

  // Fallback to MIME
  if (mimeType.startsWith('text/')) return 'code';
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('yaml')) return 'data';

  return 'unsupported';
}

export function isTextReadable(type: FileType): boolean {
  return type === 'code' || type === 'data';
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateFileId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
