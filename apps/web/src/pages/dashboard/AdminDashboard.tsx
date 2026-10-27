import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentsApi } from '../../api/students.api';
import { facultyApi } from '../../api/faculty.api';
import { requestsApi } from '../../api/requests.api';
import { projectsApi } from '../../api/projects.api';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  GraduationCap,
  Users,
  FileText,
  BookOpen,
  UserPlus,
  ShieldAlert,
  FolderGit2,
  BarChart3,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [studentCount, setStudentCount] = useState<number>(0);
  const [facultyCount, setFacultyCount] = useState<number>(0);
  const [requestCount, setRequestCount] = useState<number>(0);
  const [proposalCount, setProposalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const [students, faculty, requests, proposals] = await Promise.all([
          studentsApi.list({ limit: 1 }),
          facultyApi.list({ limit: 1 }),
          requestsApi.list({ limit: 1 }),
          projectsApi.list({ limit: 1 }),
        ]);

        setStudentCount(students.meta?.total || 0);
        setFacultyCount(faculty.meta?.total || 0);
        setRequestCount(requests.meta?.total || 0);
        setProposalCount(proposals.meta?.total || 0);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  if (isLoading) {
    return <PageLoading message="Loading department administration portal..." />;
  }

  return (
    <div className="space-y-6">
      {/* Admin Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold text-amber-200 mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Department Administration • System Control Panel</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Administrator Console — {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-xs text-amber-200 mt-1 max-w-xl">
              Academic & Records Control • Department of Computer Science & Engineering
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/students">
              <Button
                variant="primary"
                size="sm"
                className="bg-white text-slate-900 hover:bg-amber-50 border-0 shadow"
                leftIcon={<UserPlus className="w-4 h-4 text-amber-700" />}
              >
                Manage Students
              </Button>
            </Link>
            <Link to="/faculty">
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
                leftIcon={<Users className="w-4 h-4" />}
              >
                Manage Faculty
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Enrolled Students"
          value={studentCount}
          subtitle="UG and PG student records"
          icon={<GraduationCap className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Faculty Members"
          value={facultyCount}
          subtitle="Department instructors & advisors"
          icon={<Users className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Total Requests"
          value={requestCount}
          subtitle="All academic workflow requests"
          icon={<FileText className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Project Proposals"
          value={proposalCount}
          subtitle="Research proposals catalogued"
          icon={<BookOpen className="w-5 h-5" />}
          color="sky"
        />
      </div>

      {/* Quick Action Matrix & Administrative Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-slate-300 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              Student Profiles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Maintain undergraduate and postgraduate student records, enrollment status, program tracks, and academic standing.
            </p>
            <Link to="/students">
              <Button variant="outline" size="sm" className="w-full">
                Open Student Directory
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-600" />
              Project Allocations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Manage student-to-project allocations, resolve capacity conflicts, reassign supervisors, and monitor term enrollments.
            </p>
            <Link to="/allocations">
              <Button variant="outline" size="sm" className="w-full">
                Manage Allocations
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Department Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Aggregated reports on request approvals, turnaround times, faculty supervision loads, and project capacity.
            </p>
            <Link to="/reports">
              <Button variant="outline" size="sm" className="w-full">
                View Department Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
