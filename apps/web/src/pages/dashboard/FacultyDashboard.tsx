import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { approvalsApi } from '../../api/approvals.api';
import { projectsApi } from '../../api/projects.api';
import { allocationsApi } from '../../api/allocations.api';
import { DepartmentalRequest, ProjectProposal, ProjectAllocation } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  CheckSquare,
  BookOpen,
  Users,
  Award,
  ArrowRight,
  PlusCircle,
  Clock,
  Briefcase,
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<DepartmentalRequest[]>([]);
  const [myProjects, setMyProjects] = useState<ProjectProposal[]>([]);
  const [allocations, setAllocations] = useState<ProjectAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [pending, projects, allocs] = await Promise.all([
          approvalsApi.getPending(),
          projectsApi.list({ supervisorId: user?.id, limit: 10 }),
          allocationsApi.list({ limit: 50, status: 'ACTIVE' }),
        ]);

        setPendingRequests(pending);
        setMyProjects(projects.items || []);

        // Filter active allocations for proposals owned by this faculty
        const myProposalIds = new Set((projects.items || []).map((p) => p.id));
        const supervised = (allocs.items || []).filter((a) => myProposalIds.has(a.proposalId));
        setAllocations(supervised);
      } catch (err) {
        console.error('Failed to load faculty dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  if (isLoading) {
    return <PageLoading message="Loading faculty portal overview..." />;
  }

  const profile = user?.facultyProfile;
  const maxCapacity = profile?.maxProjectCapacity || 5;
  const totalAllocated = allocations.length;
  const utilization = Math.min(Math.round((totalAllocated / maxCapacity) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Faculty Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold text-indigo-200 mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              <span>
                {profile?.designation || 'Faculty Member'} • Emp ID: {profile?.employeeId || 'N/A'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Welcome, Prof. {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl">
              Specialization: {profile?.specialization || 'Computer Science & Engineering'} • Supervised Capacity: {totalAllocated}/{maxCapacity} students
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/approvals">
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow"
                leftIcon={<CheckSquare className="w-4 h-4" />}
              >
                Review Queue ({pendingRequests.length})
              </Button>
            </Link>
            <Link to="/projects">
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                New Project Proposal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Approvals"
          value={pendingRequests.length}
          subtitle="Requests assigned to your review"
          icon={<CheckSquare className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="My Proposals"
          value={myProjects.length}
          subtitle="Research projects created"
          icon={<BookOpen className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Supervised Students"
          value={totalAllocated}
          subtitle="Active student allocations"
          icon={<Users className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Capacity Utilization"
          value={`${utilization}%`}
          subtitle={`${totalAllocated} of ${maxCapacity} max capacity`}
          icon={<Award className="w-5 h-5" />}
          color="sky"
        />
      </div>

      {/* Main Grid: Pending Approvals Queue & My Project Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Approval Requests Queue */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Requests Awaiting Review</CardTitle>
                <p className="text-xs text-slate-500">Student applications routed to your faculty review stage</p>
              </div>
              <Link to="/approvals" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Open Workspace <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No pending requests in your review queue right now.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingRequests.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/requests/${req.id}`}
                            className="text-xs font-semibold text-slate-800 hover:text-indigo-600"
                          >
                            {req.title}
                          </Link>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {req.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Requester: <span className="font-medium text-slate-700">{req.requester?.firstName} {req.requester?.lastName}</span> ({req.requester?.studentProfile?.rollNumber || req.requester?.email})
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Submitted: {new Date(req.submittedAt || req.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Link to={`/requests/${req.id}`}>
                          <Button variant="primary" size="sm">
                            Review
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

        {/* Right 1 Col: My Supervised Proposals */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Project Proposals</CardTitle>
              <Link to="/projects" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                Manage
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {myProjects.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No proposals created yet.</p>
              ) : (
                myProjects.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="block p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/60 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">{p.title}</p>
                      <Badge variant={p.status === 'PUBLISHED' ? 'success' : 'default'}>
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>Term: {p.academicTerm}</span>
                      <span>Cap: {p.capacity} slots</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
