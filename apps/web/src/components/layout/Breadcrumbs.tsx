import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNameMap: Record<string, string> = {
  dashboard: 'Dashboard',
  requests: 'Departmental Requests',
  approvals: 'Approval Workspace',
  projects: 'Project Catalogue',
  allocations: 'Project Allocations',
  students: 'Students Directory',
  faculty: 'Faculty Directory',
  reports: 'Department Reports',
  notifications: 'Notifications',
  profile: 'Profile',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || pathnames[0] === 'login') return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500 mb-4">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-indigo-600 transition"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = routeNameMap[segment] || segment.replace(/-/g, ' ');

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 capitalize truncate max-w-[200px]">
                {name}
              </span>
            ) : (
              <Link to={routeTo} className="hover:text-indigo-600 transition capitalize">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
