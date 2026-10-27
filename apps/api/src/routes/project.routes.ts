import { Router } from 'express';
import { Role } from '@prisma/client';
import { projectController } from '../controllers/projectController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createProposalSchema,
  updateProposalSchema,
  submitPreferencesSchema,
  projectQuerySchema,
} from '../schemas/project.schema';
import { uuidParamSchema } from '../schemas/common.schema';

const router = Router();

router.use(authenticate);

// Student Preferences endpoints
router.get('/preferences/me', authorize(Role.STUDENT), projectController.getMyPreferences);
router.post(
  '/preferences',
  authorize(Role.STUDENT),
  validate({ body: submitPreferencesSchema }),
  projectController.submitPreferences
);

// Proposal CRUD & Listing
router.get('/', validate({ query: projectQuerySchema }), projectController.list);

router.post(
  '/',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  validate({ body: createProposalSchema }),
  projectController.create
);

router.get('/:id', validate({ params: uuidParamSchema }), projectController.getById);

router.patch(
  '/:id',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  validate({ params: uuidParamSchema, body: updateProposalSchema }),
  projectController.update
);

router.post(
  '/:id/publish',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  validate({ params: uuidParamSchema }),
  projectController.publish
);

router.post(
  '/:id/archive',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  validate({ params: uuidParamSchema }),
  projectController.archive
);

router.get(
  '/:id/applications',
  authorize(Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN),
  validate({ params: uuidParamSchema }),
  projectController.getApplications
);

export default router;
