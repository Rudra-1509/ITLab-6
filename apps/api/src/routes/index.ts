import { Router } from 'express';
import authRoutes from './auth.routes';
import studentRoutes from './student.routes';
import facultyRoutes from './faculty.routes';
import requestRoutes from './request.routes';
import approvalRoutes from './approval.routes';
import projectRoutes from './project.routes';
import allocationRoutes from './allocation.routes';
import notificationRoutes from './notification.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/faculty', facultyRoutes);
router.use('/requests', requestRoutes);
router.use('/approvals', approvalRoutes);
router.use('/projects', projectRoutes);
router.use('/allocations', allocationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);

export default router;
