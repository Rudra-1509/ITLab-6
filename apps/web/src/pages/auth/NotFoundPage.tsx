import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-slate-100 text-slate-500 rounded-2xl mb-4">
        <FileQuestion className="w-12 h-12" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">404 — Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The departmental page or resource you requested does not exist or has been relocated.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/dashboard">
          <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
