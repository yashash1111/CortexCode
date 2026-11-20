import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseFile } from '../services/fileParser';
import { authenticate } from '../../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

const ALLOWED_MIME_TYPES = new Set([
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++',
  'text/csv', 'text/xml', 'text/markdown',
  'application/json', 'application/xml', 'application/javascript',
  'application/typescript', 'application/x-yaml', 'application/yaml',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs',
  'rb', 'php', 'swift', 'kt', 'html', 'css', 'scss', 'sql', 'sh', 'md',
  'txt', 'json', 'yaml', 'yml', 'csv', 'xml', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype) || file.mimetype.startsWith('text/');
    const extOk = ALLOWED_EXTENSIONS.has(ext);

    if (mimeOk && extOk) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type or extension: ${file.originalname}`));
    }
  },
});

router.post('/', upload.array('files', 10) as any, async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const results = files.map((file) =>
      parseFile(file.originalname, file.mimetype, file.size, file.buffer)
    );

    return res.status(200).json({
      success: true,
      data: {
        files: results,
        totalFiles: results.length,
        supportedFiles: results.filter((f) => f.isSupported).length,
        unsupportedFiles: results.filter((f) => !f.isSupported).length,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'File processing failed.',
    });
  }
});

export default router;
