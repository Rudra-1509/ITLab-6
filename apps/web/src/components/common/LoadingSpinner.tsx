import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return <Loader2 className={`animate-spin text-indigo-600 ${sizeMap[size]} ${className}`} />;
};

export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Loading department data...' }) => (
  <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
    <LoadingSpinner size="lg" />
    <p className="mt-3 text-sm font-medium text-slate-500 animate-pulse">{message}</p>
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="w-full space-y-3 p-4">
    <div className="flex gap-4 mb-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-6 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-10 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
