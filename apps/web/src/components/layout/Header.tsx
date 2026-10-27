import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Menu, LogOut, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const roleColors: Record<string, string> = {
    STUDENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FACULTY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    HOD: 'bg-purple-50 text-purple-700 border-purple-200',
    DEPARTMENT_ADMIN: 'bg-amber-50 text-amber-800 border-amber-200',
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Mobile hamburger & Department branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-800">
              Department of Computer Science & Engineering
            </h1>
            <p className="text-[11px] text-slate-400">Academic & Administrative Portal</p>
          </div>
        </div>

        {/* Right: Role indicator, notifications, user profile menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user?.role && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border hidden md:inline-block ${
                roleColors[user.role] || 'bg-slate-100 text-slate-700'
              }`}
            >
              Role: {user.role.replace('_', ' ')}
            </span>
          )}

          <NotificationDropdown />

          {/* User profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {user ? `${user.firstName} ${user.lastName}` : 'Account'}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.email}</p>
              </div>
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-xs font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-slate-400">{user?.email}</p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" /> My Profile
                </Link>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out Confirmation"
        message="Are you sure you want to log out of your session? You will need to log back in to access the system."
        confirmLabel="Sign Out"
        variant="danger"
      />
    </>
  );
};
