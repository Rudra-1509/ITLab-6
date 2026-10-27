import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { uuidParamSchema } from '../schemas/common.schema';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.list);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validate({ params: uuidParamSchema }), notificationController.markAsRead);

export default router;
