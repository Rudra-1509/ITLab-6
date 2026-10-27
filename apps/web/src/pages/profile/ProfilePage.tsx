import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Mail,
  GraduationCap,
  Briefcase,
  Shield,
  LogOut,
  Calendar,
  Building,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  const student = user.studentProfile;
  const faculty = user.facultyProfile;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900">User Profile & Account</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          View your registered departmental credentials, institutional role, and academic records.
        </p>
      </div>

      {/* Main Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                    <Mail className="w-3.5 h-3.5" /> {user.email}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Badge variant="primary" className="text-xs font-semibold uppercase">
                    {user.role.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {user.status}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-slate-400" />
                  Dept: {user.department?.name || 'Computer Science & Engineering'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Account Active Since 2026
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Academic Record */}
      {student && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              Academic Enrollment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 font-medium">Roll Number</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{student.rollNumber}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 font-medium">Program Track</p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {student.program === 'UG' ? 'Undergraduate (B.Tech)' : 'Postgraduate (M.Tech)'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 font-medium">Current Semester</p>
                <p className="text-sm font-bold text-slate-800 mt-1">Semester {student.currentSemester}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 font-medium">Batch Year</p>
                <p className="text-sm font-bold text-slate-800 mt-1">Class of {student.batchYear}</p>
              </div>
            </div>

            {student.cgpa !== null && student.cgpa !== undefined && (
              <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-950">Cumulative Grade Point Average (CGPA):</span>
                <span className="text-base font-bold text-indigo-700">{student.cgpa.toFixed(2)} / 10.0</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Faculty Record */}
      {faculty && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Faculty & Supervisory Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 font-medium">Employee Identifier</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{faculty.employeeId}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 font-medium">Designation</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{faculty.designation}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 font-medium">Project Supervision Limit</p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {faculty.maxProjectCapacity} students max
                </p>
              </div>
            </div>

            {faculty.specialization && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs">
                <span className="font-semibold text-slate-700">Research Specialization: </span>
                <span className="text-slate-600">{faculty.specialization}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-600" />
            Session & Security Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Sign Out of Department Session</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Clears current session credentials and revokes authentication token.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowLogoutConfirm(true)}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Sign Out Confirmation"
        message="Are you sure you want to end your current session?"
        confirmLabel="Sign Out"
        variant="danger"
      />
    </div>
  );
};
