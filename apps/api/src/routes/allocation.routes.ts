import { Router } from 'express';
import { Role } from '@prisma/client';
import { allocationController } from '../controllers/allocationController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createAllocationSchema,
  cancelAllocationSchema,
  reassignAllocationSchema,
  allocationQuerySchema,
} from '../schemas/allocation.schema';
import { uuidParamSchema } from '../schemas/common.schema';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: allocationQuerySchema }), allocationController.list);

router.post(
  '/',
  authorize(Role.DEPARTMENT_ADMIN, Role.HOD),
  validate({ body: createAllocationSchema }),
  allocationController.create
);

router.patch(
  '/:id',
  authorize(Role.DEPARTMENT_ADMIN, Role.HOD),
  validate({ params: uuidParamSchema, body: reassignAllocationSchema }),
  allocationController.reassign
);

router.post(
  '/:id/cancel',
  authorize(Role.DEPARTMENT_ADMIN, Role.HOD),
  validate({ params: uuidParamSchema, body: cancelAllocationSchema }),
  allocationController.cancel
);

export default router;
