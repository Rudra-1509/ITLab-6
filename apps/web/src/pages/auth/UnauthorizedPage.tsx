import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl mb-4">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">403 — Access Forbidden</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        Your current role{' '}
        <span className="font-semibold text-slate-700">
          ({user?.role ? user.role.replace('_', ' ') : 'Guest'})
        </span>{' '}
        does not have authority to view this departmental resource or action.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/dashboard">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
