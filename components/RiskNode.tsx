
import React, { useState, memo, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { ProcessNodeData, Cause, Evidence, NodeType } from '../types';
import { Layout, X, Trash2, HelpCircle, Plus, FileText, ChevronDown, ChevronRight, GitCommit, Disc } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ProcessNodeProps {
  id: string;
  data: ProcessNodeData;
}

interface CauseEditItemProps {
  cause: Cause;
  onChange: (r: Cause) => void;
  onDelete: () => void;
}

// Helper to render a single cause item in the edit list
const CauseEditItem: React.FC<CauseEditItemProps> = ({ cause, onChange, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newEvidenceName, setNewEvidenceName] = useState('');

  const addEvidence = () => {
    if (!newEvidenceName.trim()) return;
    const newEvidence: Evidence = { id: uuidv4(), name: newEvidenceName, description: '' };
    onChange({ ...cause, evidence: [...cause.evidence, newEvidence] });
    setNewEvidenceName('');
  };

  const deleteEvidence = (evId: string) => {
    onChange({ ...cause, evidence: cause.evidence.filter(c => c.id !== evId) });
  };

  return (
    <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-slate-600">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <GitCommit className="w-3 h-3 text-red-500 shrink-0" />
        <input 
          className="flex-1 text-xs bg-transparent border-b border-transparent focus:border-blue-300 focus:outline-none"
          value={cause.name}
          onChange={(e) => onChange({ ...cause, name: e.target.value })}
          placeholder="Factor / Cause"
        />
        <button onClick={onDelete} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
      </div>
      
      {isExpanded && (
        <div className="pl-6 space-y-2">
          <div className="space-y-1">
            {cause.evidence.map(ev => (
              <div key={ev.id} className="flex items-center gap-2 text-[10px] text-slate-600 bg-white border border-slate-100 px-2 py-1 rounded">
                <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="flex-1 truncate">{ev.name}</span>
                <button onClick={() => deleteEvidence(ev.id)} className="text-slate-300 hover:text-red-400"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input 
              className="flex-1 text-[10px] border border-slate-200 rounded px-1 py-0.5"
              placeholder="Add evidence..."
              value={newEvidenceName}
              onChange={(e) => setNewEvidenceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEvidence()}
            />
            <button onClick={addEvidence} className="bg-slate-200 hover:bg-slate-300 text-slate-600 rounded px-1.5"><Plus className="w-3 h-3" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

// Use memo to prevent unnecessary re-renders in React Flow
const ProcessNode = memo(({ id, data }: ProcessNodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit State
  const [tempTitle, setTempTitle] = useState(data.title);
  const [tempCauses, setTempCauses] = useState<Cause[]>(data.causes || []);
  const [newCauseName, setNewCauseName] = useState('');

  // Sync local state with props when they change
  useEffect(() => {
    setTempTitle(data.title);
    setTempCauses(data.causes || []);
  }, [data.title, data.causes]);

  const handleSave = () => {
    if (data.onEdit) {
      data.onEdit(id, { title: tempTitle, causes: tempCauses });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    const event = new CustomEvent('node-delete', {
      detail: { id }
    });
    window.dispatchEvent(event);
    setIsEditing(false); 
  };

  const addNewCause = () => {
    if (!newCauseName.trim()) return;
    const newCause: Cause = { id: uuidv4(), name: newCauseName, evidence: [] };
    setTempCauses([...tempCauses, newCause]);
    setNewCauseName('');
  };

  const isProblemNode = data.type === NodeType.PROBLEM || data.id === 'problem';
  const isSpineNode = data.type === NodeType.SPINE;

  // --- SPINE NODE RENDERING ---
  if (isSpineNode) {
    return (
      <div className="relative flex items-center justify-center w-4 h-4">
        {/* Handles for Spine Connections (Left/Right) */}
        <Handle type="target" position={Position.Left} id="spine-in" className="!w-2 !h-2 !bg-slate-500 !opacity-0" />
        <Handle type="source" position={Position.Right} id="spine-out" className="!w-2 !h-2 !bg-slate-500 !opacity-0" />
        
        {/* Handles for Category Connections (Top/Bottom) - Use Target to accept incoming ribs */}
        <Handle type="target" position={Position.Top} id="rib-top" className="!w-2 !h-2 !bg-slate-500 !opacity-0" />
        <Handle type="target" position={Position.Bottom} id="rib-bottom" className="!w-2 !h-2 !bg-slate-500 !opacity-0" />

        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
      </div>
    );
  }

  // --- STANDARD CARD RENDERING ---
  return (
    <>
      {/* Handles for Flow Connections */}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !opacity-0 hover:!opacity-100 !bg-slate-400 !-ml-1.5 hover:!bg-blue-500 transition-all" />
      
      {/* Handles for Fishbone Ribs (Top/Bottom Source) - Make transparent/invisible by default to hide "point" */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !opacity-0 hover:!opacity-100 !bg-slate-400 !-mb-1.5 hover:!bg-blue-500 transition-all" />
      <Handle type="source" position={Position.Top} id="top" className="!w-3 !h-3 !opacity-0 hover:!opacity-100 !bg-slate-400 !-mt-1.5 hover:!bg-blue-500 transition-all" />

      <div className="relative group">
        {/* Popover for Editing */}
        {isEditing && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in duration-200 cursor-default max-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h4 className="text-xs font-bold text-slate-400 uppercase">{isProblemNode ? "Edit Problem" : "Edit Category"}</h4>
              <button onClick={() => setIsEditing(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-1 space-y-4 scrollbar-thin">
              {/* General Section */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                <input 
                  type="text" 
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Causes Section */}
              {!isProblemNode && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2 flex justify-between items-center">
                    Factors & Evidence
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{tempCauses.length}</span>
                  </label>
                  
                  <div className="space-y-2 mb-2">
                    {tempCauses.map(cause => (
                      <CauseEditItem 
                        key={cause.id} 
                        cause={cause} 
                        onChange={(updated) => setTempCauses(tempCauses.map(r => r.id === updated.id ? updated : r))}
                        onDelete={() => setTempCauses(tempCauses.filter(r => r.id !== cause.id))}
                      />
                    ))}
                  </div>

                  <div className="flex gap-1 mt-2">
                    <input 
                      className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5"
                      placeholder="Add factor..."
                      value={newCauseName}
                      onChange={(e) => setNewCauseName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addNewCause()}
                    />
                    <button onClick={addNewCause} className="bg-slate-800 text-white rounded px-2 hover:bg-slate-700"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-3 mt-2 border-t border-slate-100 shrink-0">
              <button 
                onClick={handleDelete}
                className="flex-1 text-xs py-2 bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 flex items-center justify-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] text-xs py-2 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div 
          onDoubleClick={() => setIsEditing(true)}
          className={`
            relative w-56 p-3 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col gap-2
            select-none min-h-[70px]
            ${isProblemNode 
              ? 'bg-red-50 border-2 border-red-400 text-red-900 shadow-red-100' 
              : 'bg-white border border-slate-300 hover:border-blue-400'}
          `}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={`font-bold text-sm leading-snug line-clamp-2 ${isProblemNode ? 'text-red-800 text-base uppercase' : 'text-blue-700 uppercase tracking-wide'}`}>
              {data.title}
            </span>
            {isProblemNode && <HelpCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {!isProblemNode && <Layout className="w-4 h-4 text-slate-300 shrink-0" />}
          </div>
          
          {data.description && (
             <div className={`text-[10px] leading-tight ${isProblemNode ? 'text-red-600' : 'text-slate-400'}`}>
               {data.description}
             </div>
          )}
          
          {/* Cause Indicators */}
          {data.causes && data.causes.length > 0 && (
            <div className="flex flex-col gap-1 mt-2 border-t border-dashed border-slate-200 pt-2">
              {data.causes.map((cause) => {
                const hasEvidence = cause.evidence && cause.evidence.length > 0;
                return (
                  <div key={cause.id} className="group/tooltip relative flex items-center gap-1.5">
                    <Disc 
                      className={`w-2 h-2 ${hasEvidence ? 'text-blue-500' : 'text-slate-400'} shrink-0`} 
                    />
                    <span className="text-[11px] text-slate-700 truncate font-medium">{cause.name}</span>
                    
                     {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 hidden group-hover/tooltip:block z-50">
                      <div className="bg-slate-800 text-white text-[10px] rounded p-2 shadow-xl">
                        <div className="font-bold mb-1 text-orange-200 flex items-center gap-1">
                           <GitCommit className="w-3 h-3" /> {cause.name}
                        </div>
                        {cause.description && <div className="mb-2 opacity-80">{cause.description}</div>}
                        
                        {hasEvidence ? (
                          <div className="space-y-1">
                             <div className="font-semibold text-slate-400 border-b border-slate-700 pb-0.5 mb-1">Evidence / 5 Whys:</div>
                             {cause.evidence.map(c => (
                               <div key={c.id} className="flex items-start gap-1">
                                 <FileText className="w-3 h-3 text-blue-400 shrink-0 top-0.5 relative" />
                                 <span>{c.name}</span>
                               </div>
                             ))}
                          </div>
                        ) : (
                          <div className="text-red-300 italic">No evidence/details provided.</div>
                        )}
                      </div>
                      <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !opacity-0 hover:!opacity-100 !bg-slate-400 !-mr-1.5 hover:!bg-blue-500 transition-all" />
    </>
  );
});

export default ProcessNode;