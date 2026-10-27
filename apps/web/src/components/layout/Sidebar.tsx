import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { approvalsApi } from '../../api/approvals.api';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  BookOpen,
  FolderGit2,
  Users,
  GraduationCap,
  BarChart3,
  Bell,
  UserCircle,
  School,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, hasRole } = useAuth();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  const canReview = hasRole('FACULTY', 'HOD', 'DEPARTMENT_ADMIN');
  const isHodOrAdmin = hasRole('HOD', 'DEPARTMENT_ADMIN');

  useEffect(() => {
    if (canReview) {
      approvalsApi
        .getPending()
        .then((items) => setPendingApprovalsCount(items.length))
        .catch(() => {});
    }
  }, [canReview]);

  const navLinks = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      show: true,
    },
    {
      to: '/requests',
      label: 'Department Requests',
      icon: <FileText className="w-4 h-4" />,
      show: true,
    },
    {
      to: '/approvals',
      label: 'Approval Workspace',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      show: canReview,
    },
    {
      to: '/projects',
      label: 'Project Proposals',
      icon: <BookOpen className="w-4 h-4" />,
      show: true,
    },
    {
      to: '/allocations',
      label: 'Project Allocations',
      icon: <FolderGit2 className="w-4 h-4" />,
      show: isHodOrAdmin,
    },
    {
      to: '/students',
      label: 'Students Directory',
      icon: <GraduationCap className="w-4 h-4" />,
      show: isHodOrAdmin,
    },
    {
      to: '/faculty',
      label: 'Faculty Directory',
      icon: <Users className="w-4 h-4" />,
      show: isHodOrAdmin,
    },
    {
      to: '/reports',
      label: 'Department Reports',
      icon: <BarChart3 className="w-4 h-4" />,
      show: canReview,
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      show: true,
    },
    {
      to: '/profile',
      label: 'My Profile',
      icon: <UserCircle className="w-4 h-4" />,
      show: true,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">University DMS</span>
              <p className="text-[10px] text-slate-400 font-mono">Dept. Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User quick tag */}
        <div className="px-5 py-3.5 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
              </p>
              <span className="inline-block text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                {user?.role?.replace('_', ' ') || 'VISITOR'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks
            .filter((link) => link.show)
            .map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            ))}
        </div>

        {/* Footer version */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>CSE Department v1.0</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Operational" />
        </div>
      </aside>
    </>
  );
};
