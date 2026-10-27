import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@dms/database';

describe('Integration: Departmental Requests & Approval Workflows', () => {
  let studentToken: string;
  let otherStudentToken: string;
  let facultyToken: string;
  let hodToken: string;

  beforeAll(async () => {
    // Authenticate test personas
    const [s1, s2, fac, hod] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'student.rahul@university.edu', password: 'Password@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'student.ananya@university.edu', password: 'Password@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'prof.sharma@university.edu', password: 'Password@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'hod.cse@university.edu', password: 'Password@123' }),
    ]);

    studentToken = s1.body.data.token;
    otherStudentToken = s2.body.data.token;
    facultyToken = fac.body.data.token;
    hodToken = hod.body.data.token;
  });

  it('allows student to create draft, submit, and prevents other students from IDOR tampering', async () => {
    // 1. Create draft request
    const createRes = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        category: 'COURSE_REGISTRATION',
        title: 'Request to register for Distributed Systems Elective',
        description: 'Completed all prerequisite courses with grade A. Requesting prerequisite waiver.',
        academicContext: { courseCode: 'CS702', term: '2024-AUTUMN' },
        priority: 'HIGH',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const requestId = createRes.body.data.id;
    expect(createRes.body.data.currentStatus).toBe('DRAFT');

    // 2. IDOR Prevention: Other student attempting to read private request
    const idorReadRes = await request(app)
      .get(`/api/v1/requests/${requestId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect(idorReadRes.status).toBe(403);
    expect(idorReadRes.body.success).toBe(false);

    // 3. IDOR Prevention: Other student attempting to submit or modify request
    const idorSubmitRes = await request(app)
      .post(`/api/v1/requests/${requestId}/submit`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect(idorSubmitRes.status).toBe(403);

    // 4. Authorized owner submits request
    const submitRes = await request(app)
      .post(`/api/v1/requests/${requestId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.currentStatus).toBe('UNDER_REVIEW');
    expect(submitRes.body.data.currentStage).toBe('FACULTY_REVIEW');

    // 5. Unauthorized approval: Student attempting to approve their own request
    const studentApproveRes = await request(app)
      .post(`/api/v1/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ comments: 'I approve myself.' });

    expect(studentApproveRes.status).toBe(403);

    // 6. Faculty approves Stage 1 (FACULTY_REVIEW) -> Advances to HOD_REVIEW
    const facultyApproveRes = await request(app)
      .post(`/api/v1/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ comments: 'Academic transcript verified. Endorsed.' });

    expect(facultyApproveRes.status).toBe(200);
    expect(facultyApproveRes.body.data.currentStatus).toBe('UNDER_REVIEW');
    expect(facultyApproveRes.body.data.currentStage).toBe('HOD_REVIEW');

    // 7. Faculty attempting to approve HOD_REVIEW stage -> Must be forbidden
    const facultyBypassRes = await request(app)
      .post(`/api/v1/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ comments: 'Trying to approve HOD stage' });

    expect(facultyBypassRes.status).toBe(403);

    // 8. HOD approves Stage 2 (HOD_REVIEW) -> Advances to FINAL_DECISION
    const hodApproveRes = await request(app)
      .post(`/api/v1/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${hodToken}`)
      .send({ comments: 'HOD approval confirmed.' });

    expect(hodApproveRes.status).toBe(200);
    expect(hodApproveRes.body.data.currentStage).toBe('FINAL_DECISION');

    // 9. HOD grants final decision -> Status transitions to APPROVED
    const finalDecisionRes = await request(app)
      .post(`/api/v1/requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${hodToken}`)
      .send({ comments: 'Sanctioned and recorded.' });

    expect(finalDecisionRes.status).toBe(200);
    expect(finalDecisionRes.body.data.currentStatus).toBe('APPROVED');

    // 10. Audit history verification
    const historyRes = await request(app)
      .get(`/api/v1/requests/${requestId}/history`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(4);
  });

  it('verifies pending approval queue and rejection with mandatory reason', async () => {
    // Create and submit request
    const reqRes = await request(app)
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        category: 'LAB_ACCESS',
        title: 'High-Performance GPU Cluster Access',
        description: 'Requires CUDA GPU cluster for deep learning model training.',
      });

    const requestId = reqRes.body.data.id;
    await request(app).post(`/api/v1/requests/${requestId}/submit`).set('Authorization', `Bearer ${studentToken}`);

    // Check pending approvals queue for Faculty
    const pendingRes = await request(app)
      .get('/api/v1/approvals/pending')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(pendingRes.status).toBe(200);
    const found = pendingRes.body.data.some((r: { id: string }) => r.id === requestId);
    expect(found).toBe(true);

    // Reject without reason -> 400 Validation Error
    const invalidRejectRes = await request(app)
      .post(`/api/v1/requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({});

    expect(invalidRejectRes.status).toBe(400);

    // Reject with proper reason -> 200 REJECTED
    const rejectRes = await request(app)
      .post(`/api/v1/requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        rejectionReason: 'Cluster access is reserved for registered PhD candidates this semester.',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.currentStatus).toBe('REJECTED');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
