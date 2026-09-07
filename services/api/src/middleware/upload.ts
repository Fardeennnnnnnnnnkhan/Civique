import multer from 'multer';
import crypto from 'crypto';

// Use memory storage to process file buffers directly without local disk writes
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('LIMIT_UNSUPPORTED_FILE_TYPE'));
  }
};

const uploadInstance = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

export const upload = uploadInstance;
export const uploadMiddleware = uploadInstance.single('image');

export type ValidatedImage = { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; sha256: string; width?: number; height?: number };
export function validateImageBuffer(buffer: Buffer, declaredMime?: string): ValidatedImage {
  let mimeType: ValidatedImage['mimeType'] | null = null;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) mimeType = 'image/jpeg';
  else if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mimeType = 'image/png';
  else if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') mimeType = 'image/webp';
  if (!mimeType || (declaredMime && declaredMime !== mimeType)) throw new Error('INVALID_IMAGE_CONTENT');
  return { mimeType, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
}
