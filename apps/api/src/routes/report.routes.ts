import { Router } from 'express';
import { Role } from '@prisma/client';
import { reportController } from '../controllers/reportController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

// Reports restricted to Faculty, HOD, and Department Admin
router.get(
  '/requests',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  reportController.getRequestReport
);

router.get(
  '/allocations',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  reportController.getAllocationReport
);

export default router;
