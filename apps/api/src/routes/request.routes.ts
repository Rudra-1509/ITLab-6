import { Router } from 'express';
import { Role } from '@prisma/client';
import { requestController } from '../controllers/requestController';
import { approvalController } from '../controllers/approvalController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createRequestSchema,
  updateRequestSchema,
  resubmitRequestSchema,
  requestQuerySchema,
} from '../schemas/request.schema';
import { approveStageSchema, rejectRequestSchema, requestChangesSchema } from '../schemas/approval.schema';
import { uuidParamSchema } from '../schemas/common.schema';

const router = Router();

router.use(authenticate);

// Request collection
router.get('/', validate({ query: requestQuerySchema }), requestController.list);
router.post('/', validate({ body: createRequestSchema }), requestController.create);

// Individual request operations
router.get('/:id', validate({ params: uuidParamSchema }), requestController.getById);
router.patch('/:id', validate({ params: uuidParamSchema, body: updateRequestSchema }), requestController.update);
router.get('/:id/history', validate({ params: uuidParamSchema }), requestController.getHistory);

// Lifecycle actions
router.post('/:id/submit', validate({ params: uuidParamSchema }), requestController.submit);
router.post('/:id/cancel', validate({ params: uuidParamSchema }), requestController.cancel);
router.post(
  '/:id/resubmit',
  validate({ params: uuidParamSchema, body: resubmitRequestSchema }),
  requestController.resubmit
);

// Workflow Review/Approval actions (Authorized roles only: Faculty, HOD, Admin)
router.post(
  '/:id/approve',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  validate({ params: uuidParamSchema, body: approveStageSchema }),
  approvalController.approve
);

router.post(
  '/:id/reject',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  validate({ params: uuidParamSchema, body: rejectRequestSchema }),
  approvalController.reject
);

router.post(
  '/:id/request-changes',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  validate({ params: uuidParamSchema, body: requestChangesSchema }),
  approvalController.requestChanges
);

export default router;
