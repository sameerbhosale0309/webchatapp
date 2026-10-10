import multer from 'multer';
import { uploadToCloudinaryBuffer } from '../utils/cloudinary.js';

// Multer in-memory storage for Cloudinary streaming
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

/**
 * Handle Single or Multiple File Upload to Cloudinary
 */
export async function uploadMedia(req, res) {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const uploadResults = await Promise.all(
      files.map(async (file) => {
        let resourceType = 'auto';
        let category = 'file';

        if (file.mimetype.startsWith('image/')) {
          resourceType = 'image';
          category = 'image';
        } else if (file.mimetype.startsWith('video/')) {
          resourceType = 'video';
          category = 'video';
        } else if (file.mimetype.startsWith('audio/')) {
          resourceType = 'video'; // Cloudinary uses 'video' resource_type for audio files
          category = 'audio';
        } else {
          resourceType = 'raw';
          category = 'document';
        }

        const result = await uploadToCloudinaryBuffer(file.buffer, {
          folder: 'realtime-chat-uploads',
          resource_type: resourceType,
          mimeType: file.mimetype,
          filename: file.originalname.split('.')[0],
        });

        return {
          url: result.url,
          public_id: result.public_id,
          type: category,
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        };
      })
    );

    const isSingle = !req.files && req.file;

    return res.status(201).json({
      success: true,
      message: 'File(s) uploaded successfully to Cloudinary',
      data: isSingle ? uploadResults[0] : uploadResults,
    });
  } catch (err) {
    console.error('Error uploading file to Cloudinary:', err);
    return res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
}
