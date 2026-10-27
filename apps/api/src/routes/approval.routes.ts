import { Router } from 'express';
import { Role } from '@prisma/client';
import { approvalController } from '../controllers/approvalController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

// Pending approvals queue for faculty, HOD, and administrators
router.get(
  '/pending',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  approvalController.getPending
);

export default router;
