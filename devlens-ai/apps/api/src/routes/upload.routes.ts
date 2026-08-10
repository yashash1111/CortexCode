import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseFile } from '../services/file/fileParser';

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++',
  'text/csv', 'text/xml', 'text/markdown',
  'application/json', 'application/xml', 'application/javascript',
  'application/typescript', 'application/x-yaml', 'application/yaml',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream' // fallback for unnamed types
]);

// Multer — memory storage, no disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Allow if MIME matches or file extension suggests text
    const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype) ||
      file.mimetype.startsWith('text/') ||
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('application/');

    if (mimeOk) {
      cb(null, true);
    } else {
      cb(null, true); // Accept all but mark as unsupported in parser
    }
  }
});

// POST /api/upload
router.post('/', upload.array('files', 10) as any, async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded.'
      });
    }

    const results = files.map(file => {
      return parseFile(
        file.originalname,
        file.mimetype,
        file.size,
        file.buffer
      );
    });

    return res.status(200).json({
      success: true,
      data: {
        files: results,
        totalFiles: results.length,
        supportedFiles: results.filter(f => f.isSupported).length,
        unsupportedFiles: results.filter(f => !f.isSupported).length
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'File processing failed. Please try again.'
    });
  }
});

export default router;
