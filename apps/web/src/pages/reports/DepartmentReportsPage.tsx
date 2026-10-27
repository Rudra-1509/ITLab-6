import React, { useEffect, useState } from 'react';
import { reportsApi } from '../../api/reports.api';
import { RequestReportData, AllocationReportData } from '../../types';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Download,
  CheckCircle2,
  FolderGit2,
  Users,
} from 'lucide-react';

export const DepartmentReportsPage: React.FC = () => {
  const { error: toastError, success } = useToast();
  const [requestReport, setRequestReport] = useState<RequestReportData | null>(null);
  const [allocationReport, setAllocationReport] = useState<AllocationReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setIsLoading(true);
      try {
        const [reqs, allocs] = await Promise.all([
          reportsApi.getRequestReport(),
          reportsApi.getAllocationReport(),
        ]);
        setRequestReport(reqs);
        setAllocationReport(allocs);
      } catch (err) {
        toastError(getApiErrorMessage(err), 'Failed to load department reports');
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, [toastError]);

  if (isLoading) {
    return <PageLoading message="Compiling departmental analytics and metrics..." />;
  }

  const exportData = () => {
    const reportSnapshot = {
      exportedAt: new Date().toISOString(),
      requests: requestReport,
      allocations: allocationReport,
    };
    const blob = new Blob([JSON.stringify(reportSnapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `department-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Department analytics snapshot exported successfully.');
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const categoryChartData = (requestReport?.byCategory || []).map((c) => ({
    name: c.category.replace(/_/g, ' '),
    count: c.count,
  }));

  const statusChartData = (requestReport?.byStatus || []).map((s) => ({
    name: s.status.replace(/_/g, ' '),
    value: s.count,
  }));

  const workloadChartData = (allocationReport?.facultyWorkload || []).map((f) => ({
    name: f.name.replace('Prof. ', '').replace('Dr. ', ''),
    Allocated: f.allocatedCount,
    Capacity: f.maxCapacity,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Department Operational Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated metrics on academic workflow throughput, supervisor allocations, and capacity.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={exportData}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export Report (JSON)
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={requestReport?.summary.total || 0}
          subtitle="All recorded submissions"
          icon={<BarChart3 className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Approved Rate"
          value={
            requestReport?.summary.total
              ? `${Math.round(
                  ((requestReport.summary.approved || 0) / requestReport.summary.total) * 100
                )}%`
              : '0%'
          }
          subtitle={`${requestReport?.summary.approved || 0} granted`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Capacity Utilization"
          value={`${Math.round(allocationReport?.summary.utilizationRate || 0)}%`}
          subtitle={`${allocationReport?.summary.totalAllocated || 0} of ${
            allocationReport?.summary.totalCapacity || 0
          } slots`}
          icon={<FolderGit2 className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Active Supervisors"
          value={allocationReport?.facultyWorkload.length || 0}
          subtitle="Department research faculty"
          icon={<Users className="w-5 h-5" />}
          color="sky"
        />
      </div>

      {/* Charts Section 1: Requests by Category & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category data recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {statusChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No status data recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {statusChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 2: Faculty Supervision Workload vs Max Capacity */}
      <Card>
        <CardHeader>
          <CardTitle>Faculty Supervisory Workload & Max Capacity</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {workloadChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No faculty supervision workload data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadChartData} margin={{ top: 20, right: 30, left: -10, bottom: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Allocated" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Capacity" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
