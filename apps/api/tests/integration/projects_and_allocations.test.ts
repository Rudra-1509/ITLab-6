import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@dms/database';

describe('Integration: Project Proposals, Allocation & Reports', () => {
  let studentToken: string;
  let facultyToken: string;
  let hodToken: string;

  beforeAll(async () => {
    // Authenticate test personas
    const [s1, fac, hod] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'student.rahul@university.edu', password: 'Password@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'prof.sharma@university.edu', password: 'Password@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'hod.cse@university.edu', password: 'Password@123' }),
    ]);

    studentToken = s1.body.data.token;
    facultyToken = fac.body.data.token;
    hodToken = hod.body.data.token;

    // Clean up test preferences, allocations, and proposals for 2025-SPRING
    await prisma.projectPreference.deleteMany({ where: { academicTerm: '2025-SPRING' } });
    await prisma.projectAllocation.deleteMany({ where: { academicTerm: '2025-SPRING' } });
    await prisma.projectProposal.deleteMany({ where: { academicTerm: '2025-SPRING' } });
  });

  it('allows faculty to create and publish proposals, and students to browse', async () => {
    // 1. Faculty creates proposal
    const createRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        title: 'Verifiable Computation on Distributed Ledgers',
        description: 'Explore zero-knowledge rollups and STARKs for scaling state machine replication.',
        academicTerm: '2025-SPRING',
        ugPgEligibility: 'BOTH',
        capacity: 2,
        prerequisites: 'Discrete mathematics, Rust or Go',
      });

    expect(createRes.status).toBe(201);
    const proposalId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('DRAFT');

    // 2. Student cannot browse draft proposal
    const studentBrowseDraft = await request(app)
      .get(`/api/v1/projects/${proposalId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentBrowseDraft.status).toBe(404);

    // 3. Faculty publishes proposal
    const publishRes = await request(app)
      .post(`/api/v1/projects/${proposalId}/publish`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.status).toBe('PUBLISHED');

    // 4. Student can now browse published proposal
    const studentBrowsePublished = await request(app)
      .get(`/api/v1/projects/${proposalId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentBrowsePublished.status).toBe(200);
    expect(studentBrowsePublished.body.data.title).toBe('Verifiable Computation on Distributed Ledgers');
  });

  it('allows students to submit ranked project preferences', async () => {
    // Find published proposals for 2025-SPRING
    const proposalsRes = await request(app)
      .get('/api/v1/projects?academicTerm=2025-SPRING')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(proposalsRes.status).toBe(200);
    const proposals = proposalsRes.body.data;
    expect(proposals.length).toBeGreaterThan(0);

    const prefPayload = {
      academicTerm: '2025-SPRING',
      preferences: [
        {
          proposalId: proposals[0].id,
          rank: 1,
        },
      ],
    };

    const submitPrefRes = await request(app)
      .post('/api/v1/projects/preferences')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(prefPayload);

    expect(submitPrefRes.status).toBe(200);
    expect(submitPrefRes.body.success).toBe(true);

    // Fetch submitted preferences
    const getPrefRes = await request(app)
      .get('/api/v1/projects/preferences/me?academicTerm=2025-SPRING')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(getPrefRes.status).toBe(200);
    expect(getPrefRes.body.data.length).toBe(1);
    expect(getPrefRes.body.data[0].rank).toBe(1);
  });

  it('provides comprehensive reporting for requests and allocations', async () => {
    // 1. Request report
    const reqReportRes = await request(app)
      .get('/api/v1/reports/requests')
      .set('Authorization', `Bearer ${hodToken}`);

    expect(reqReportRes.status).toBe(200);
    expect(reqReportRes.body.success).toBe(true);
    expect(reqReportRes.body.data.totalRequests).toBeDefined();
    expect(Array.isArray(reqReportRes.body.data.byStatus)).toBe(true);
    expect(Array.isArray(reqReportRes.body.data.byCategory)).toBe(true);

    // 2. Allocation report
    const allocReportRes = await request(app)
      .get('/api/v1/reports/allocations?academicTerm=2025-SPRING')
      .set('Authorization', `Bearer ${hodToken}`);

    expect(allocReportRes.status).toBe(200);
    expect(allocReportRes.body.success).toBe(true);
    expect(allocReportRes.body.data.summary).toBeDefined();
    expect(allocReportRes.body.data.summary.totalCapacity).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(allocReportRes.body.data.facultyWorkload)).toBe(true);

    // 3. Unauthorized access to reports by student
    const studentReportRes = await request(app)
      .get('/api/v1/reports/requests')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentReportRes.status).toBe(403);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
