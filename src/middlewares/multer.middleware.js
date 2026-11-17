import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, resolve } from 'node:path';
import { ApiError } from '../utils/ApiError.js';
export const uploadDirectory = resolve('public/temp');
mkdirSync(uploadDirectory, { recursive: true });
export const upload = multer({
  storage: multer.diskStorage({ destination: uploadDirectory, filename: (req, file, cb) => cb(null, randomUUID() + extname(file.originalname).toLowerCase()) }),
  limits: { fileSize: 100 * 1024 * 1024, files: 2, fields: 12 },
  fileFilter(req, file, cb) {
    const allowed = file.fieldname === 'videoFile' ? ['video/mp4', 'video/webm', 'video/quicktime'] : ['image/jpeg', 'image/png', 'image/webp'];
    cb(allowed.includes(file.mimetype) ? null : new ApiError(400, 'Unsupported file type'), allowed.includes(file.mimetype));
  }
});

