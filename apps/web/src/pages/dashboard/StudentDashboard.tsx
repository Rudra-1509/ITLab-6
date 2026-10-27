import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { requestsApi } from '../../api/requests.api';
import { projectsApi } from '../../api/projects.api';
import { allocationsApi } from '../../api/allocations.api';
import { DepartmentalRequest, ProjectProposal, ProjectAllocation } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { RequestStatusBadge } from '../../components/requests/RequestStatusBadge';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  FileText,
  Clock,
  CheckCircle,
  PlusCircle,
  BookOpen,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DepartmentalRequest[]>([]);
  const [myAllocation, setMyAllocation] = useState<ProjectAllocation | null>(null);
  const [featuredProjects, setFeaturedProjects] = useState<ProjectProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [reqsRes, allocsRes, projectsRes] = await Promise.all([
          requestsApi.list({ limit: 5 }),
          allocationsApi.list({ studentId: user?.id, status: 'ACTIVE' }),
          projectsApi.list({ status: 'PUBLISHED', limit: 3 }),
        ]);

        setRequests(reqsRes.items || []);
        if (allocsRes.items && allocsRes.items.length > 0) {
          setMyAllocation(allocsRes.items[0]);
        }
        setFeaturedProjects(projectsRes.items || []);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  if (isLoading) {
    return <PageLoading message="Loading student portal overview..." />;
  }

  const profile = user?.studentProfile;
  const pendingCount = requests.filter((r) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(r.currentStatus)
  ).length;
  const approvedCount = requests.filter((r) => r.currentStatus === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold text-indigo-200 mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>
                {profile?.program === 'UG' ? 'Undergraduate' : 'Postgraduate'} Student • Roll No: {profile?.rollNumber || 'N/A'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Welcome, {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl">
              Semester {profile?.currentSemester || 7} • Batch of {profile?.batchYear || 2026} • Dept. of Computer Science & Engineering
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/requests">
              <Button variant="primary" size="sm" className="bg-white text-indigo-900 hover:bg-indigo-50 border-0" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Submit New Request
              </Button>
            </Link>
            <Link to="/projects">
              <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/10" leftIcon={<BookOpen className="w-4 h-4" />}>
                Browse Projects
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Submitted Requests"
          value={requests.length}
          subtitle="Total requests on record"
          icon={<FileText className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Under Review"
          value={pendingCount}
          subtitle="Awaiting decision / changes"
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Approved Requests"
          value={approvedCount}
          subtitle="Successfully granted"
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Project Status"
          value={myAllocation ? 'Allocated' : 'Open'}
          subtitle={myAllocation ? myAllocation.academicTerm : 'Preferences open'}
          icon={<BookOpen className="w-5 h-5" />}
          color={myAllocation ? 'emerald' : 'sky'}
        />
      </div>

      {/* Main Grid: Requests & Project Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Requests */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent Departmental Requests</CardTitle>
                <p className="text-xs text-slate-500">Track status and review decisions for your applications</p>
              </div>
              <Link to="/requests" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {requests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  You haven't submitted any departmental requests yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {requests.slice(0, 5).map((req) => (
                    <Link
                      key={req.id}
                      to={`/requests/${req.id}`}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 hover:text-indigo-600">
                            {req.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {req.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{req.description}</p>
                        <p className="text-[11px] text-slate-400">
                          Updated: {new Date(req.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <div className="shrink-0 ml-4">
                        <RequestStatusBadge status={req.currentStatus} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Project Allocation Card & Available Projects */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Project Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {myAllocation ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                      Assigned Project
                    </span>
                    <h4 className="text-sm font-semibold text-emerald-950 mt-1">
                      {myAllocation.proposal?.title}
                    </h4>
                    <p className="text-xs text-emerald-800 mt-2">
                      Supervisor:{' '}
                      <span className="font-semibold">
                        {myAllocation.proposal?.supervisor?.firstName} {myAllocation.proposal?.supervisor?.lastName}
                      </span>
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Term: {myAllocation.academicTerm}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">No Project Assigned Yet</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Explore published proposals by departmental faculty and submit your ranked preferences.
                    </p>
                  </div>
                  <Link to="/projects">
                    <Button variant="primary" size="sm" className="w-full">
                      Submit Preferences
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Featured Proposals */}
          <Card>
            <CardHeader>
              <CardTitle>Published Proposals</CardTitle>
              <Link to="/projects" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {featuredProjects.slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="block p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/60 transition"
                >
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1">{p.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supervisor: {p.supervisor?.firstName} {p.supervisor?.lastName}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span>Term: {p.academicTerm}</span>
                    <span className="text-indigo-600 font-medium">Cap: {p.capacity}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
