import { prisma, Role, RequestStatus, AllocationStatus } from '@dms/database';
import { AuthenticatedUser } from '../types';
import { ForbiddenError } from '../utils/errors';

export class ReportService {
  /**
   * Request counts by status and category, plus pending approval breakdown
   */
  async getRequestReport(currentUser: AuthenticatedUser, departmentId?: string) {
    if (currentUser.role === Role.STUDENT) {
      throw new ForbiddenError('Students are not authorized to access department-wide reports.');
    }

    const deptId = departmentId || currentUser.departmentId || undefined;

    const baseWhere = deptId ? { departmentId: deptId } : {};

    const [byStatusRaw, byCategoryRaw, pendingApprovalsRaw] = await Promise.all([
      // Count by status
      prisma.departmentalRequest.groupBy({
        by: ['currentStatus'],
        where: baseWhere,
        _count: { id: true },
      }),
      // Count by category
      prisma.departmentalRequest.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: { id: true },
      }),
      // Pending approvals by stage
      prisma.departmentalRequest.groupBy({
        by: ['currentStage'],
        where: {
          ...baseWhere,
          currentStatus: RequestStatus.UNDER_REVIEW,
        },
        _count: { id: true },
      }),
    ]);

    const totalRequests = byStatusRaw.reduce((acc, curr) => acc + curr._count.id, 0);

    return {
      departmentId: deptId || 'ALL',
      totalRequests,
      byStatus: byStatusRaw.map((item) => ({ status: item.currentStatus, count: item._count.id })),
      byCategory: byCategoryRaw.map((item) => ({ category: item.category, count: item._count.id })),
      pendingByStage: pendingApprovalsRaw.map((item) => ({
        stage: item.currentStage,
        count: item._count.id,
      })),
    };
  }

  /**
   * Project capacity, utilization, and faculty supervision workload
   */
  async getAllocationReport(currentUser: AuthenticatedUser, academicTerm?: string) {
    if (currentUser.role === Role.STUDENT) {
      throw new ForbiddenError('Students are not authorized to view allocation reports.');
    }

    const termWhere = academicTerm ? { academicTerm } : {};

    // 1. Proposals and capacity utilization
    const proposals = await prisma.projectProposal.findMany({
      where: termWhere,
      select: {
        id: true,
        title: true,
        academicTerm: true,
        capacity: true,
        status: true,
        supervisor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: {
            allocations: {
              where: { status: AllocationStatus.ACTIVE },
            },
          },
        },
      },
    });

    const totalCapacity = proposals.reduce((acc, p) => acc + p.capacity, 0);
    const totalAllocated = proposals.reduce((acc, p) => acc + p._count.allocations, 0);
    const utilizationRate = totalCapacity > 0 ? Number(((totalAllocated / totalCapacity) * 100).toFixed(2)) : 0;

    // 2. Program breakdown (UG vs PG allocated)
    const activeAllocations = await prisma.projectAllocation.findMany({
      where: {
        status: AllocationStatus.ACTIVE,
        ...(academicTerm ? { academicTerm } : {}),
      },
      include: {
        student: {
          include: { studentProfile: true },
        },
      },
    });

    const programBreakdown = {
      UG: activeAllocations.filter((a) => a.student.studentProfile?.program === 'UG').length,
      PG: activeAllocations.filter((a) => a.student.studentProfile?.program === 'PG').length,
    };

    // 3. Faculty Supervision Workload
    const facultyWorkloadMap = new Map<
      string,
      { facultyId: string; name: string; email: string; assignedCount: number; maxCapacity: number }
    >();

    for (const prop of proposals) {
      const fId = prop.supervisor.id;
      const current = facultyWorkloadMap.get(fId) || {
        facultyId: fId,
        name: `${prop.supervisor.firstName} ${prop.supervisor.lastName}`,
        email: prop.supervisor.email,
        assignedCount: 0,
        maxCapacity: 0,
      };
      current.assignedCount += prop._count.allocations;
      facultyWorkloadMap.set(fId, current);
    }

    return {
      academicTerm: academicTerm || 'ALL',
      summary: {
        totalProposals: proposals.length,
        totalCapacity,
        totalAllocated,
        utilizationRatePercent: utilizationRate,
      },
      programBreakdown,
      facultyWorkload: Array.from(facultyWorkloadMap.values()),
      proposalsUtilization: proposals.map((p) => ({
        id: p.id,
        title: p.title,
        supervisor: `${p.supervisor.firstName} ${p.supervisor.lastName}`,
        capacity: p.capacity,
        allocatedCount: p._count.allocations,
        availableSlots: Math.max(0, p.capacity - p._count.allocations),
      })),
    };
  }
}

export const reportService = new ReportService();
