
import React, { useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Edge, 
  Node, 
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow';
import { NodeType, Cause, Evidence } from '../types';
import ProcessNode from './RiskNode';
import { X, Plus, FileText, GitCommit } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ProcessGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onAddNode: (type: NodeType) => void;
  onUpdateNode: (id: string, title: string, description: string) => void;
  onDeleteNode: (id: string) => void;
  onUpdateEdge: (id: string, data: { label?: string, causes?: Cause[] }) => void;
  onDeleteEdge: (id: string) => void;
}

const nodeTypes = {
  processNode: ProcessNode,
};

interface EdgeCauseItemProps {
  cause: Cause;
  onUpdate: (r: Cause) => void;
  onRemove: () => void;
}

const EdgeCauseItem: React.FC<EdgeCauseItemProps> = ({ cause, onUpdate, onRemove }) => {
    const [newEvidence, setNewEvidence] = useState('');
    
    const addEvidence = () => {
        if(!newEvidence.trim()) return;
        const ev: Evidence = { id: uuidv4(), name: newEvidence, description: '' };
        onUpdate({ ...cause, evidence: [...cause.evidence, ev] });
        setNewEvidence('');
    };

    return (
        <div className="border border-slate-100 rounded p-2 bg-slate-50 text-xs">
            <div className="flex items-center gap-2 mb-1">
                <GitCommit className={`w-3 h-3 ${cause.evidence.length > 0 ? 'text-blue-500' : 'text-orange-500'}`} />
                <span className="font-medium flex-1">{cause.name}</span>
                <button onClick={onRemove} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3"/></button>
            </div>
            <div className="pl-5 space-y-1">
                {cause.evidence.map(c => (
                    <div key={c.id} className="flex items-center gap-1 text-[10px] text-slate-500">
                        <FileText className="w-3 h-3 text-blue-500"/>
                        <span>{c.name}</span>
                        <button onClick={() => onUpdate({...cause, evidence: cause.evidence.filter(x => x.id !== c.id)})} className="ml-auto text-slate-300 hover:text-red-400"><X className="w-2 h-2"/></button>
                    </div>
                ))}
                <div className="flex gap-1 mt-1">
                    <input value={newEvidence} onChange={e => setNewEvidence(e.target.value)} placeholder="Add evidence..." className="w-full border rounded px-1 py-0.5 text-[10px]" />
                    <button onClick={addEvidence} className="bg-slate-200 hover:bg-slate-300 rounded px-1"><Plus className="w-3 h-3"/></button>
                </div>
            </div>
        </div>
    )
}

const ProcessGraphContent: React.FC<ProcessGraphProps> = ({ 
  nodes, edges, onNodesChange, onEdgesChange, onConnect,
  onAddNode, onDeleteNode, onUpdateEdge, onDeleteEdge
}) => {
  
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [edgeLabelInput, setEdgeLabelInput] = useState('');
  const [edgeCauses, setEdgeCauses] = useState<Cause[]>([]);
  const [newCauseName, setNewCauseName] = useState('');

  React.useEffect(() => {
    const handleNodeDelete = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { id } = customEvent.detail;
      onDeleteNode(id);
    };

    window.addEventListener('node-delete', handleNodeDelete);
    
    return () => {
      window.removeEventListener('node-delete', handleNodeDelete);
    };
  }, [onDeleteNode]);

  const onEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setEditingEdge(edge);
    setEdgeLabelInput(edge.label as string || '');
    setEdgeCauses((edge.data?.causes as Cause[]) || []);
  };

  const saveEdgeEdit = () => {
    if (editingEdge) {
      onUpdateEdge(editingEdge.id, { label: edgeLabelInput, causes: edgeCauses });
      setEditingEdge(null);
    }
  };

  const deleteEdge = () => {
    if (editingEdge) {
      onDeleteEdge(editingEdge.id);
      setEditingEdge(null);
    }
  };

  const addCause = () => {
    if (!newCauseName.trim()) return;
    const newCause: Cause = { id: uuidv4(), name: newCauseName, evidence: [] };
    setEdgeCauses([...edgeCauses, newCause]);
    setNewCauseName('');
  };

  const updateCause = (causeId: string, updatedCause: Cause) => {
    setEdgeCauses(edgeCauses.map(r => r.id === causeId ? updatedCause : r));
  };

  const removeCause = (causeId: string) => {
    setEdgeCauses(edgeCauses.filter(r => r.id !== causeId));
  };

  return (
    <div className="w-full h-full relative bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        attributionPosition="bottom-right"
        defaultEdgeOptions={{ type: 'straight', style: { strokeWidth: 2 } }}
      >
        <Background color="#cbd5e1" gap={24} size={1} />
        <Controls className="bg-white border border-slate-200 shadow-sm" />
        
        {editingEdge && (
          <div className="absolute top-20 right-4 w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-right-5">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
               <h3 className="text-sm font-bold text-slate-700">Edit Connection</h3>
               <button onClick={() => setEditingEdge(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold text-slate-500 mb-1">Label</label>
                 <input 
                   className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:border-blue-500 focus:outline-none" 
                   value={edgeLabelInput}
                   onChange={(e) => setEdgeLabelInput(e.target.value)}
                   placeholder="e.g. 'contributes to'"
                 />
               </div>

               <div>
                 <label className="block text-xs font-semibold text-slate-500 mb-2">Contributing Factors</label>
                 <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                   {edgeCauses.map(cause => (
                      <EdgeCauseItem 
                        key={cause.id} 
                        cause={cause} 
                        onUpdate={(u) => updateCause(cause.id, u)}
                        onRemove={() => removeCause(cause.id)}
                      />
                   ))}
                 </div>
                 
                 <div className="flex gap-2 mt-2">
                   <input 
                     className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5"
                     placeholder="Add factor..."
                     value={newCauseName}
                     onChange={(e) => setNewCauseName(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && addCause()}
                   />
                   <button onClick={addCause} className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded px-2"><Plus className="w-4 h-4" /></button>
                 </div>
               </div>
               
               <div className="flex gap-2 pt-2 border-t border-slate-100">
                 <button onClick={deleteEdge} className="flex-1 text-xs py-2 bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100">Delete Link</button>
                 <button onClick={saveEdgeEdit} className="flex-1 text-xs py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Save</button>
               </div>
             </div>
          </div>
        )}

      </ReactFlow>
    </div>
  );
};

export default ProcessGraphContent;
