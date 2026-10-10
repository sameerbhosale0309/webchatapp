import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadMiddleware, uploadMedia } from '../controllers/uploadController.js';

const router = express.Router();

router.use(protect);

// Endpoint for uploading single or multiple files to Cloudinary
router.post('/', uploadMiddleware.array('files', 10), uploadMedia);

export default router;
