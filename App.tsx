
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import BowTieGraph from './components/BowTieGraph';
import ChatInterface from './components/ChatInterface';
import { INITIAL_REACTFLOW_NODES, INITIAL_REACTFLOW_EDGES } from './constants';
import { ChatMessage, ContentType, MessageRole, NodeType, ProcessNodeData, Cause, Evidence } from './types';
import { generateProcessResponse } from './services/geminiService';
import { 
  Node, 
  Edge, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  MarkerType 
} from 'reactflow';
import { GripVertical } from 'lucide-react';

const App: React.FC = () => {
  // State for React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_REACTFLOW_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_REACTFLOW_EDGES);

  // State for Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: MessageRole.MODEL,
      content: "Welcome to Root Cause Analysis.\n\nI can help you build a Fishbone Diagram using the 5 Whys method. \n\nLet's start by defining the **Problem Statement**.",
      type: ContentType.TEXT,
      timestamp: Date.now()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // State for Sidebar Resizing
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);

  // File Input Ref for Import (Project Level)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Resizing Logic ---
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Calculate new width relative to the right edge of the window
      const newWidth = window.innerWidth - e.clientX;
      
      // Enforce min and max constraints
      if (newWidth >= 300 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize'; // Force cursor during drag
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // --- Graph Manipulation Handlers ---

  // Defined first so it can be passed to nodes
  const handleUpdateNode = useCallback((id: string, data: Partial<ProcessNodeData>) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === id) {
        return { 
          ...node, 
          data: { 
            ...node.data, 
            ...data 
          } 
        };
      }
      return node;
    }));
  }, [setNodes]);

  // Inject handleUpdateNode into nodes that don't have it (e.g. initial nodes)
  useEffect(() => {
    setNodes((nds) => nds.map(node => {
      if (!node.data.onEdit) {
        return { ...node, data: { ...node.data, onEdit: handleUpdateNode } };
      }
      return node;
    }));
  }, [handleUpdateNode, setNodes]);

  const handleAddNode = (type: NodeType, title?: string, description?: string, desiredId?: string) => {
    const xPos = 100 + (nodes.length * 50); 
    const yPos = 100 + (nodes.length * 50);

    const newNodeId = desiredId || `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const newNode: Node = {
      id: newNodeId,
      type: 'processNode',
      position: { x: xPos, y: yPos },
      data: {
        id: newNodeId,
        type: type,
        title: title || (type === NodeType.PROBLEM ? 'Problem' : 'Category'),
        description: description || '',
        causes: [],
        onEdit: handleUpdateNode
      },
    };
    setNodes((nds) => [...nds, newNode]);
    return newNodeId;
  };

  const handleDeleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  const handleConnect = useCallback((params: Connection) => {
     const newEdge = { 
      ...params, 
      id: `e-${Date.now()}`,
      style: { strokeWidth: 2, stroke: '#64748b' },
      data: { causes: [] }
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const handleUpdateEdge = (id: string, data: { label?: string, causes?: Cause[] }) => {
    setEdges((eds) => eds.map(e => {
      if (e.id === id) {
        const updatedEdge = { 
          ...e, 
          label: data.label !== undefined ? data.label : e.label,
          data: { 
            ...e.data, 
            causes: data.causes !== undefined ? data.causes : e.data.causes 
          }
        };
        return updatedEdge;
      }
      return e;
    }));
  };

  const handleDeleteEdge = (id: string) => {
    setEdges((eds) => eds.filter(e => e.id !== id));
  };

  // --- Chat Operations ---

  const addMessage = (role: MessageRole, content: string, type: ContentType = ContentType.TEXT, extra?: Partial<ChatMessage>) => {
    const newMsg: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      type,
      timestamp: Date.now(),
      ...extra
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'init-1',
        role: MessageRole.MODEL,
        content: "Welcome to Root Cause Analysis.",
        type: ContentType.TEXT,
        timestamp: Date.now()
      }
    ]);
  };

  const handleSendMessage = async (text: string, fileContent?: string) => {
    const userDisplayMessage = text || (fileContent ? "Attached document for analysis." : "...");
    addMessage(MessageRole.USER, userDisplayMessage, ContentType.TEXT, { attachedFileName: fileContent ? "Attached Document" : undefined });
    setIsTyping(true);

    // API Call Context
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content + (m.attachedFileName ? "\n[User attached a file in this turn]" : "") }]
    }));
    
    // Serialize full graph state with Causes and Evidence
    const graphContext = JSON.stringify({
      nodes: nodes.map(n => ({ 
        id: n.id, 
        label: n.data.title, 
        description: n.data.description,
        causes: n.data.causes 
      })),
      edges: edges.map(e => ({ 
        id: e.id,
        source: e.source, 
        target: e.target, 
        label: e.label,
        causes: e.data?.causes 
      }))
    });

    const response = await generateProcessResponse(history, text, graphContext, fileContent);
    
    // Execute Tools
    if (response.toolCalls && response.toolCalls.length > 0) {
      let changeLog = "";
      
      let localNodes = [...nodes];
      let localEdges = [...edges];

      // Smart Fishbone Node Adder
      const addNodeFishbone = (title?: string, description?: string, desiredId?: string) => {
         // Prevent duplicates
         if (desiredId && localNodes.find(n => n.id === desiredId)) {
            return desiredId;
         }

         const newNodeId = desiredId || `n-${Date.now()}`;
         const type = title?.toLowerCase().includes('problem') ? NodeType.PROBLEM : NodeType.CATEGORY;

         // Logic for placement
         // 1. Find all spine nodes (exclude tail)
         // 2. Count connections to each spine node
         // 3. Fill Top (y: 50) then Bottom (y: 550) for each spine node
         // 4. If all full, create new spine node
         
         const spineNodes = localNodes.filter(n => n.data.type === NodeType.SPINE && n.id !== 'spine_tail').sort((a,b) => a.position.x - b.position.x);
         const problemNode = localNodes.find(n => n.data.type === NodeType.PROBLEM);

         let targetSpineId = '';
         let newPosition = { x: 0, y: 0 };
         let handleType = 'top'; // top or bottom relative to spine

         // Check slots
         for (const spine of spineNodes) {
           const connectedNodes = localEdges.filter(e => e.target === spine.id); // Incoming edges from ribs
           // We expect ribs to be connected TO the spine
           
           const topRib = connectedNodes.find(e => {
             const sourceNode = localNodes.find(n => n.id === e.source);
             return sourceNode && sourceNode.position.y < 300;
           });
           
           const bottomRib = connectedNodes.find(e => {
             const sourceNode = localNodes.find(n => n.id === e.source);
             return sourceNode && sourceNode.position.y > 300;
           });

           if (!topRib) {
             targetSpineId = spine.id;
             newPosition = { x: spine.position.x - 150, y: 50 };
             handleType = 'top'; // This will be a top node connecting to spine
             break;
           } else if (!bottomRib) {
             targetSpineId = spine.id;
             newPosition = { x: spine.position.x - 150, y: 550 };
             handleType = 'bottom';
             break;
           }
         }

         // If no slots, create new spine segment
         if (!targetSpineId && problemNode) {
            // Shift problem node right
            const oldProblemX = problemNode.position.x;
            const newSpineX = oldProblemX - 250; // Place where problem was roughly, push problem further
            
            // Update Problem Node Position locally
            const probIdx = localNodes.findIndex(n => n.id === problemNode.id);
            if (probIdx !== -1) {
              localNodes[probIdx] = { ...problemNode, position: { x: oldProblemX + 350, y: problemNode.position.y } };
            }

            // Create new Spine Node
            const newSpineId = `spine_${spineNodes.length + 1}_auto`;
            const newSpineNode: Node = {
              id: newSpineId,
              type: 'processNode',
              position: { x: newSpineX + 350, y: 300 }, // Align with existing spine Y
              data: { id: newSpineId, type: NodeType.SPINE, title: '', causes: [] }
            };
            localNodes.push(newSpineNode);

            // Connect last spine to new spine
            const lastSpine = spineNodes[spineNodes.length - 1];
            if (lastSpine) {
               localEdges.push({
                 id: `s-auto-${Date.now()}`,
                 source: lastSpine.id,
                 target: newSpineId,
                 style: { strokeWidth: 4, stroke: '#475569' },
                 type: 'straight'
               });
            }
            // Reconnect problem to new spine (remove old connection)
            const oldProbEdgeIdx = localEdges.findIndex(e => e.target === problemNode.id);
            if (oldProbEdgeIdx !== -1) localEdges.splice(oldProbEdgeIdx, 1);
            
            localEdges.push({
               id: `s-end-${Date.now()}`,
               source: newSpineId,
               target: problemNode.id,
               style: { strokeWidth: 4, stroke: '#475569' },
               type: 'straight'
            });

            // Set target for new rib
            targetSpineId = newSpineId;
            newPosition = { x: newSpineNode.position.x - 150, y: 50 };
            handleType = 'top';
         }

         // Create the Rib Node
         const newNode: Node = {
          id: newNodeId,
          type: 'processNode',
          position: newPosition,
          data: {
            id: newNodeId,
            type: type,
            title: title || `Category`,
            description: description || '',
            causes: [],
            onEdit: handleUpdateNode 
          },
        };
        localNodes.push(newNode);

        // Auto-connect to Spine if we found a spot
        if (targetSpineId) {
          const ribStyle = { strokeWidth: 2, stroke: '#64748b' };
          localEdges.push({
             id: `e-auto-${Date.now()}`,
             source: newNodeId,
             target: targetSpineId,
             style: ribStyle,
             type: 'straight',
             // Logic: If node is at Top (y=50), source is Bottom, target is Spine Top
             sourceHandle: handleType === 'top' ? 'bottom' : 'top',
             targetHandle: handleType === 'top' ? 'rib-top' : 'rib-bottom'
          });
        }

        return newNodeId;
      };

      response.toolCalls.forEach(tool => {
        if (tool.name === 'clear_graph') {
          localNodes = [];
          localEdges = [];
          changeLog += "• Cleared canvas\n";
        }
        else if (tool.name === 'add_node') {
          const { title, description, id } = tool.args;
          addNodeFishbone(title, description, id);
          changeLog += `• Added Category: ${title}\n`;
        } 
        else if (tool.name === 'connect_nodes') {
          const { sourceId, targetId, label } = tool.args;
          const newEdge = {
            id: `e-ai-${Date.now()}-${Math.random()}`,
            source: sourceId,
            target: targetId,
            label: label || '',
            style: { strokeWidth: 2, stroke: '#64748b' },
            data: { causes: [] }
          };
          localEdges = addEdge(newEdge, localEdges);
          changeLog += `• Connected ${sourceId} -> ${targetId}\n`;
        }
        else if (tool.name === 'update_node') {
           const { id, title, description } = tool.args;
           const nodeIndex = localNodes.findIndex(n => n.id === id);
           if (nodeIndex !== -1) {
              const n = localNodes[nodeIndex];
              localNodes[nodeIndex] = {
                 ...n,
                 data: { 
                   ...n.data, 
                   title: title || n.data.title, 
                   description: description !== undefined ? description : n.data.description 
                 }
              };
              changeLog += `• Updated: ${title || n.data.title}\n`;
           }
        }
        else if (tool.name === 'add_cause') {
          const { targetId, targetType, name, description } = tool.args;
          const newCause: Cause = { id: uuidv4(), name, description, evidence: [] };
          
          if (targetType === 'NODE' || !targetType) {
             const nIndex = localNodes.findIndex(n => n.id === targetId);
             if (nIndex !== -1) {
               const n = localNodes[nIndex];
               const currentCauses = n.data.causes || [];
               localNodes[nIndex] = { ...n, data: { ...n.data, causes: [...currentCauses, newCause] } };
               changeLog += `• Added Factor to ${n.data.title}: ${name}\n`;
             }
          } else if (targetType === 'EDGE') {
             const eIndex = localEdges.findIndex(e => e.id === targetId);
             if (eIndex !== -1) {
               const e = localEdges[eIndex];
               const currentCauses = (e.data?.causes as Cause[]) || [];
               localEdges[eIndex] = { ...e, data: { ...e.data, causes: [...currentCauses, newCause] } };
               changeLog += `• Added Factor to Link: ${name}\n`;
             }
          }
        }
        else if (tool.name === 'add_evidence') {
          const { targetId, targetType, causeName, name, description } = tool.args;
          const newEvidence: Evidence = { id: uuidv4(), name, description };
          
          if (targetType === 'NODE' || !targetType) {
            const nIndex = localNodes.findIndex(n => n.id === targetId);
            if (nIndex !== -1) {
              const n = localNodes[nIndex];
              const updatedCauses = (n.data.causes || []).map(r => {
                if (r.name.toLowerCase() === causeName.toLowerCase()) {
                  return { ...r, evidence: [...r.evidence, newEvidence] };
                }
                return r;
              });
              localNodes[nIndex] = { ...n, data: { ...n.data, causes: updatedCauses } };
              changeLog += `• Added Evidence to Factor '${causeName}': ${name}\n`;
            }
          } else if (targetType === 'EDGE') {
             const eIndex = localEdges.findIndex(e => e.id === targetId);
             if (eIndex !== -1) {
               const e = localEdges[eIndex];
               const updatedCauses = ((e.data?.causes as Cause[]) || []).map(r => {
                 if (r.name.toLowerCase() === causeName.toLowerCase()) {
                   return { ...r, evidence: [...r.evidence, newEvidence] };
                 }
                 return r;
               });
               localEdges[eIndex] = { ...e, data: { ...e.data, causes: updatedCauses } };
               changeLog += `• Added Evidence to Link Factor '${causeName}': ${name}\n`;
             }
          }
        }
      });

      setNodes(localNodes);
      setEdges(localEdges);

      if (changeLog) {
        response.text = (response.text || "") + "\n\n**Diagram Updates:**\n" + changeLog;
      }
    }

    addMessage(MessageRole.MODEL, response.text || "Diagram updated.");
    setIsTyping(false);
  };

  // --- Import / Export Handlers ---

  const handleSaveModel = () => {
    const modelData = {
      metadata: {
        version: '3.0',
        timestamp: new Date().toISOString(),
        appName: 'Root Cause Fishbone'
      },
      nodes,
      edges
    };
    
    const blob = new Blob([JSON.stringify(modelData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rca-fishbone-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
          // Inject handler into imported nodes
          const importedNodes = data.nodes.map((n: Node) => ({
            ...n,
            data: { ...n.data, onEdit: handleUpdateNode }
          }));
          setNodes(importedNodes);
          setEdges(data.edges);
          addMessage(MessageRole.MODEL, `Imported fishbone diagram with ${data.nodes.length} nodes.`);
        } else {
          addMessage(MessageRole.MODEL, "Invalid file format.");
        }
      } catch (error) {
        console.error("Import error:", error);
        addMessage(MessageRole.MODEL, "Error parsing file.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-blue-100">
      
      {/* HEADER */}
      <header className="h-auto bg-white border-b border-slate-200 flex flex-col shrink-0 z-30 shadow-sm">
        <div className="h-16 flex items-center px-8 justify-between">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 flex items-center justify-center overflow-hidden">
               <img 
                 src="https://storage.googleapis.com/toolbox-478717-storage/branding/worker.png" 
                 alt="RCA Logo" 
                 className="w-full h-full object-contain"
               />
             </div>
             <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">Root Cause Fishbone</h1>
                <span className="text-[10px] font-medium text-slate-400 tracking-wider">by Auditor in the Loop</span>
             </div>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Factors</span>
                <span className="text-sm font-semibold text-slate-700">
                  {nodes.reduce((acc, node) => acc + (node.data.causes?.length || 0), 0)}
                </span>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
              />

              <div className="h-8 w-px bg-slate-100"></div>
              
              <button 
                onClick={handleImportClick}
                className="px-3 py-2 text-slate-600 bg-white border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                Import
              </button>
              
              <button 
                onClick={handleSaveModel}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Save Analysis
              </button>
           </div>
        </div>
      </header>

      {/* BODY CONTENT: ROW LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* MAIN CONTENT: Graph */}
        <main className="flex-1 relative bg-slate-100 min-w-0">
          <BowTieGraph 
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onAddNode={(type) => handleAddNode(type)} 
            onUpdateNode={(id, title, description) => handleUpdateNode(id, { title, description })}
            onDeleteNode={handleDeleteNode}
            onUpdateEdge={handleUpdateEdge}
            onDeleteEdge={handleDeleteEdge}
          />
        </main>

        {/* DRAG HANDLE */}
        <div 
          onMouseDown={startResizing}
          className={`
            w-1 hover:w-2 transition-all duration-150 ease-out cursor-col-resize z-50 flex items-center justify-center group shrink-0
            ${isResizing ? 'bg-blue-500 w-2 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-200 hover:bg-blue-400'}
          `}
        >
          {/* Optional: Visual grip dots that appear on hover */}
          <div className={`h-8 w-0.5 bg-white/50 rounded opacity-0 group-hover:opacity-100 ${isResizing ? 'opacity-100' : ''}`} />
        </div>

        {/* RIGHT SIDEBAR: Chat */}
        <section 
          style={{ width: sidebarWidth }}
          className="shrink-0 z-40 relative bg-white shadow-[-4px_0_20px_-5px_rgba(0,0,0,0.05)] flex flex-col"
        >
          <ChatInterface 
            messages={messages} 
            isTyping={isTyping} 
            onSendMessage={handleSendMessage}
            onSuggestionClick={(text) => handleSendMessage(text)}
            onClearChat={handleClearChat}
          />
        </section>

      </div>

    </div>
  );
};

export default App;
