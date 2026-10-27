import { Router } from 'express';
import { Role } from '@prisma/client';
import { facultyController } from '../controllers/facultyController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createFacultySchema, updateFacultySchema, facultyQuerySchema } from '../schemas/faculty.schema';
import { uuidParamSchema } from '../schemas/common.schema';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: facultyQuerySchema }), facultyController.list);

router.get('/:id', validate({ params: uuidParamSchema }), facultyController.getById);

router.post(
  '/',
  authorize(Role.DEPARTMENT_ADMIN, Role.HOD),
  validate({ body: createFacultySchema }),
  facultyController.create
);

router.patch(
  '/:id',
  authorize(Role.DEPARTMENT_ADMIN, Role.HOD, Role.FACULTY),
  validate({ params: uuidParamSchema, body: updateFacultySchema }),
  facultyController.update
);

export default router;
