import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  limit = 10,
  onPageChange,
  onLimitChange,
}) => {
  if (totalPages <= 1 && !total) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-xs text-slate-600">
      <div className="flex items-center gap-3">
        {total !== undefined && (
          <span>
            Showing <span className="font-semibold">{Math.min((page - 1) * limit + 1, total)}</span> to{' '}
            <span className="font-semibold">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold">{total}</span> results
          </span>
        )}
        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>
        <span className="px-2 font-medium">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
