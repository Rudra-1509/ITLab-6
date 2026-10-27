import React from 'react';
import { RequestWorkflowHistory, WorkflowStage, RequestStatus } from '../../types';
import { RequestStatusBadge } from './RequestStatusBadge';
import { CheckCircle2, Clock, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface WorkflowTimelineProps {
  currentStage?: WorkflowStage | null;
  currentStatus: RequestStatus;
  history?: RequestWorkflowHistory[];
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  currentStage,
  currentStatus,
  history = [],
}) => {
  const allStages: { key: WorkflowStage; label: string }[] = [
    { key: 'FACULTY_REVIEW', label: 'Faculty Review' },
    { key: 'HOD_REVIEW', label: 'HOD Review' },
    { key: 'FINAL_DECISION', label: 'Final Decision' },
  ];

  // Determine stage progress
  const getStageStatus = (stageKey: WorkflowStage) => {
    if (currentStatus === 'APPROVED') return 'completed';
    if (currentStatus === 'REJECTED') {
      if (currentStage === stageKey) return 'rejected';
    }
    if (currentStage === stageKey) return 'active';
    const stageIndex = allStages.findIndex((s) => s.key === stageKey);
    const currentIndex = allStages.findIndex((s) => s.key === currentStage);
    if (currentIndex > -1 && stageIndex < currentIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Visual Stepper */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-6">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Approval Workflow Stages
        </h4>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
          {allStages.map((stage, index) => {
            const status = getStageStatus(stage.key);
            return (
              <React.Fragment key={stage.key}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs border transition ${
                      status === 'completed'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : status === 'active'
                        ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100'
                        : status === 'rejected'
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    {status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                    {status === 'active' && <Clock className="w-4 h-4 animate-pulse" />}
                    {status === 'rejected' && <XCircle className="w-4 h-4" />}
                    {status === 'pending' && index + 1}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        status === 'active'
                          ? 'text-indigo-900'
                          : status === 'completed'
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </p>
                    <p className="text-[11px] text-slate-400 capitalize">
                      {status === 'active'
                        ? currentStatus.toLowerCase().replace('_', ' ')
                        : status}
                    </p>
                  </div>
                </div>
                {index < allStages.length - 1 && (
                  <div className="hidden sm:block flex-1 mx-4 h-0.5 bg-slate-200" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Decision Audit Trail History */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Decision History & Audit Trail
        </h4>
        {history.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No workflow actions recorded yet.</p>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 py-2">
            {history.map((record) => (
              <div key={record.id} className="relative pl-6">
                {/* Dot */}
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-600" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {record.actor ? `${record.actor.firstName} ${record.actor.lastName}` : 'System'}
                    </span>
                    {record.actor?.role && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
                        {record.actor.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(record.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                  <span className="font-medium text-indigo-700">{record.action.replace('_', ' ')}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <RequestStatusBadge status={record.resultingStatus} />
                  {record.stage && (
                    <span className="text-slate-400">({record.stage.replace('_', ' ')})</span>
                  )}
                </div>

                {record.rejectionReason && (
                  <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Rejection Reason:
                    </div>
                    {record.rejectionReason}
                  </div>
                )}

                {record.comments && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-700">
                    <span className="font-semibold text-slate-600">Comments: </span>
                    {record.comments}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
