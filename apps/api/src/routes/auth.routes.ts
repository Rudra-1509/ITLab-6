import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { rateLimiter } from '../middleware/rateLimiter';
import { loginSchema } from '../schemas/auth.schema';

const router = Router();

// Login rate limited to protect against brute-force attacks
router.post('/login', rateLimiter({ maxRequests: 10 }), validate({ body: loginSchema }), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
