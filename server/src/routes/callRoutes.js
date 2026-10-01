import express from 'express';
import { createCallLog, getCalls } from '../controllers/callController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createCallLog);
router.get('/', getCalls);

export default router;
