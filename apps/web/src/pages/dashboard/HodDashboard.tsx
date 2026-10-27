import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { approvalsApi } from '../../api/approvals.api';
import { reportsApi } from '../../api/reports.api';
import { DepartmentalRequest, RequestReportData, AllocationReportData } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  CheckSquare,
  Users,
  FolderGit2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const HodDashboard: React.FC = () => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<DepartmentalRequest[]>([]);
  const [requestReport, setRequestReport] = useState<RequestReportData | null>(null);
  const [allocationReport, setAllocationReport] = useState<AllocationReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [pending, reqReport, allocReport] = await Promise.all([
          approvalsApi.getPending(),
          reportsApi.getRequestReport().catch(() => null),
          reportsApi.getAllocationReport().catch(() => null),
        ]);

        setPendingApprovals(pending);
        setRequestReport(reqReport);
        setAllocationReport(allocReport);
      } catch (err) {
        console.error('Failed to load HOD dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return <PageLoading message="Loading department head overview..." />;
  }

  const pendingCount = pendingApprovals.length;
  const totalRequests = requestReport?.summary.total || 0;
  const approvedTotal = requestReport?.summary.approved || 0;
  const totalCapacity = allocationReport?.summary.totalCapacity || 0;
  const totalAllocated = allocationReport?.summary.totalAllocated || 0;

  return (
    <div className="space-y-6">
      {/* HOD Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold text-purple-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Head of Department • Department of Computer Science & Engineering</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Welcome, Dr. {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-xs text-purple-200 mt-1 max-w-xl">
              Department Executive Overview • {pendingCount} requests currently awaiting your approval or final decision
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/approvals">
              <Button
                variant="primary"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow"
                leftIcon={<CheckSquare className="w-4 h-4" />}
              >
                HOD Approval Queue ({pendingCount})
              </Button>
            </Link>
            <Link to="/allocations">
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
                leftIcon={<FolderGit2 className="w-4 h-4" />}
              >
                Project Allocation Matrix
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending HOD Decisions"
          value={pendingCount}
          subtitle="Requests awaiting action"
          icon={<AlertCircle className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Department Requests"
          value={totalRequests}
          subtitle={`${approvedTotal} successfully approved`}
          icon={<CheckSquare className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Project Capacity"
          value={`${totalAllocated}/${totalCapacity}`}
          subtitle={`${Math.round(allocationReport?.summary.utilizationRate || 0)}% capacity utilized`}
          icon={<FolderGit2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Faculty Workloads"
          value={allocationReport?.facultyWorkload.length || 0}
          subtitle="Active supervisors in department"
          icon={<Users className="w-5 h-5" />}
          color="sky"
        />
      </div>

      {/* Queue & Workload Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pending Escalated & Assigned Requests */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>HOD Approval Queue</CardTitle>
                <p className="text-xs text-slate-500">
                  Requests reaching HOD review or final decision stage
                </p>
              </div>
              <Link to="/approvals" className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1">
                View All Pending ({pendingCount}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {pendingApprovals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No requests currently waiting for HOD review.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingApprovals.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/requests/${req.id}`}
                            className="text-xs font-semibold text-slate-800 hover:text-purple-600"
                          >
                            {req.title}
                          </Link>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-200">
                            {req.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Student: {req.requester?.firstName} {req.requester?.lastName} ({req.requester?.studentProfile?.rollNumber || req.requester?.email})
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Stage: <span className="font-medium text-slate-700">{req.currentStage?.replace(/_/g, ' ') || 'Under Review'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Link to={`/requests/${req.id}`}>
                          <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700">
                            Decide
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Faculty Supervision Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Faculty Workloads</CardTitle>
              <Link to="/reports" className="text-xs text-purple-600 hover:text-purple-800 font-semibold">
                Reports
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {!allocationReport || allocationReport.facultyWorkload.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No workload records found.</p>
              ) : (
                allocationReport.facultyWorkload.slice(0, 5).map((fw) => (
                  <div key={fw.facultyId} className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>{fw.name}</span>
                      <span className="text-indigo-600">
                        {fw.allocatedCount}/{fw.maxCapacity} slots
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          fw.allocatedCount >= fw.maxCapacity ? 'bg-rose-500' : 'bg-indigo-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            Math.round((fw.allocatedCount / (fw.maxCapacity || 1)) * 100),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
