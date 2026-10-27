import React from 'react';
import { ProjectProposal } from '../../types';
import { Card, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Users, Calendar, Award, CheckCircle2, BookOpen } from 'lucide-react';

interface ProjectCardProps {
  proposal: ProjectProposal;
  onViewDetails: (proposal: ProjectProposal) => void;
  onSelectPreference?: (proposal: ProjectProposal) => void;
  onPublish?: (proposal: ProjectProposal) => void;
  onArchive?: (proposal: ProjectProposal) => void;
  isStudent?: boolean;
  isOwnerOrStaff?: boolean;
  isSelected?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  proposal,
  onViewDetails,
  onSelectPreference,
  onPublish,
  onArchive,
  isStudent = false,
  isOwnerOrStaff = false,
  isSelected = false,
}) => {
  const allocationsCount = proposal._count?.allocations ?? proposal.allocations?.length ?? 0;
  const isFull = allocationsCount >= proposal.capacity;
  const slotsRemaining = Math.max(proposal.capacity - allocationsCount, 0);

  return (
    <Card className="hover:border-slate-300 transition-all flex flex-col justify-between">
      <CardContent className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <Badge
              variant={
                proposal.ugPgEligibility === 'BOTH'
                  ? 'purple'
                  : proposal.ugPgEligibility === 'UG'
                  ? 'info'
                  : 'primary'
              }
            >
              {proposal.ugPgEligibility === 'BOTH' ? 'UG & PG' : `${proposal.ugPgEligibility} Only`}
            </Badge>

            <Badge
              variant={
                proposal.status === 'PUBLISHED'
                  ? 'success'
                  : proposal.status === 'DRAFT'
                  ? 'warning'
                  : 'neutral'
              }
            >
              {proposal.status}
            </Badge>
          </div>

          <h3 className="text-base font-semibold text-slate-800 line-clamp-2 hover:text-indigo-600 transition cursor-pointer" onClick={() => onViewDetails(proposal)}>
            {proposal.title}
          </h3>

          <p className="text-xs text-slate-500 mt-2 line-clamp-3">
            {proposal.description}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-700">
                {proposal.supervisor ? `${proposal.supervisor.firstName} ${proposal.supervisor.lastName}` : 'Faculty Member'}
              </span>
              {proposal.supervisor?.facultyProfile?.designation && (
                <span className="text-slate-400 text-[11px]">
                  ({proposal.supervisor.facultyProfile.designation})
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Term: {proposal.academicTerm}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className={isFull ? 'text-rose-600 font-semibold' : 'text-slate-700 font-medium'}>
                  {allocationsCount}/{proposal.capacity} slots ({slotsRemaining} left)
                </span>
              </div>
            </div>

            {proposal.prerequisites && (
              <div className="flex items-start gap-1.5 text-slate-500 bg-slate-50 p-2 rounded text-[11px]">
                <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="line-clamp-1">Prerequisites: {proposal.prerequisites}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => onViewDetails(proposal)}>
            View Details
          </Button>

          <div className="flex items-center gap-2">
            {isStudent && onSelectPreference && proposal.status === 'PUBLISHED' && (
              <Button
                variant={isSelected ? 'success' : 'primary'}
                size="sm"
                onClick={() => onSelectPreference(proposal)}
                disabled={isFull}
                leftIcon={isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : undefined}
              >
                {isSelected ? 'Rank Selected' : isFull ? 'Capacity Full' : 'Add Preference'}
              </Button>
            )}

            {isOwnerOrStaff && proposal.status === 'DRAFT' && onPublish && (
              <Button variant="success" size="sm" onClick={() => onPublish(proposal)}>
                Publish
              </Button>
            )}

            {isOwnerOrStaff && proposal.status === 'PUBLISHED' && onArchive && (
              <Button variant="outline" size="sm" onClick={() => onArchive(proposal)}>
                Archive
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
