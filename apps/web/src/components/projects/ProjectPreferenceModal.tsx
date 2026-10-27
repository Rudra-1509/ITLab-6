import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ProjectProposal } from '../../types';
import { ArrowUp, ArrowDown, Trash2, CheckCircle2 } from 'lucide-react';

interface ProjectPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProposals: ProjectProposal[];
  onRemoveProposal: (id: string) => void;
  onReorder: (proposals: ProjectProposal[]) => void;
  onSubmitPreferences: (payload: { preferences: { proposalId: string; rank: number }[]; academicTerm: string }) => Promise<void>;
  isLoading?: boolean;
}

export const ProjectPreferenceModal: React.FC<ProjectPreferenceModalProps> = ({
  isOpen,
  onClose,
  selectedProposals,
  onRemoveProposal,
  onReorder,
  onSubmitPreferences,
  isLoading = false,
}) => {
  const [academicTerm, setAcademicTerm] = useState('2026-AUTUMN');

  const moveUp = (index: number) => {
    if (index === 0) return;
    const items = [...selectedProposals];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    onReorder(items);
  };

  const moveDown = (index: number) => {
    if (index === selectedProposals.length - 1) return;
    const items = [...selectedProposals];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    onReorder(items);
  };

  const handleSubmit = async () => {
    if (selectedProposals.length === 0) return;
    const preferences = selectedProposals.map((p, index) => ({
      proposalId: p.id,
      rank: index + 1,
    }));

    await onSubmitPreferences({
      preferences,
      academicTerm,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Project Preferences"
      description="Rank your preferred project proposals in order of priority (1 = highest preference)."
      maxWidth="lg"
    >
      <div className="space-y-4">
        <Input
          label="Academic Term"
          value={academicTerm}
          onChange={(e) => setAcademicTerm(e.target.value)}
          placeholder="e.g. 2026-AUTUMN"
          required
        />

        {selectedProposals.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
            No proposals added yet. Browse the catalogue and click "Add Preference".
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Ranked Preferences ({selectedProposals.length})
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
              {selectedProposals.map((proposal, index) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-3 gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">{proposal.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Supervisor: {proposal.supervisor?.firstName} {proposal.supervisor?.lastName} • Term: {proposal.academicTerm}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move preference up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === selectedProposals.length - 1}
                      onClick={() => moveDown(index)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move preference down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveProposal(proposal.id)}
                      className="p-1 rounded text-rose-400 hover:text-rose-600 ml-1"
                      aria-label="Remove preference"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={selectedProposals.length === 0}
            isLoading={isLoading}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Submit Preferences
          </Button>
        </div>
      </div>
    </Modal>
  );
};
