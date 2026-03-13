import { Router } from 'express';
import {
  loginController,
  registerController,
} from '../controllers/auth.controller.js';
import {
  loginRateLimiter,
  registerRateLimiter,
} from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', loginRateLimiter, loginController);
router.post('/register', registerRateLimiter, registerController);

export default router;
