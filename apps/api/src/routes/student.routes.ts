import { Router } from 'express';
import { Role } from '@prisma/client';
import { studentController } from '../controllers/studentController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createStudentSchema, updateStudentSchema, studentQuerySchema } from '../schemas/student.schema';
import { uuidParamSchema } from '../schemas/common.schema';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: studentQuerySchema }), studentController.list);

router.get('/:id', validate({ params: uuidParamSchema }), studentController.getById);

router.post(
  '/',
  authorize(Role.DEPARTMENT_ADMIN, Role.HOD),
  validate({ body: createStudentSchema }),
  studentController.create
);

router.patch(
  '/:id',
  authorize(Role.DEPARTMENT_ADMIN, Role.HOD),
  validate({ params: uuidParamSchema, body: updateStudentSchema }),
  studentController.update
);

export default router;
