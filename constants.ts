
import { NodeType } from './types';
import { MarkerType } from 'reactflow';

// FISHBONE LAYOUT COORDINATES
// Problem (Head) at Far Right
// Spine runs horizontally
// Categories angle in from Top-Left and Bottom-Left relative to their spine attachment

const SPINE_Y = 300;
const TOP_ROW_Y = 50;
const BOTTOM_ROW_Y = 550;

// Spine Nodes (Invisible connection points)
// X coords - spaced evenly
const SPACING_X = 350;
const TAIL_X = 50;
const SPINE_1_X = TAIL_X + SPACING_X;     // 400
const SPINE_2_X = SPINE_1_X + SPACING_X;  // 750
const SPINE_3_X = SPINE_2_X + SPACING_X;  // 1100
const PROBLEM_X = SPINE_3_X + 250;        // 1350

// Category Offsets (Shift left to create angled ribs)
const RIB_OFFSET_X = 150; 

export const INITIAL_REACTFLOW_NODES = [
  // --- SPINE STRUCTURE ---
  { 
    id: 'spine_tail', 
    type: 'processNode', 
    position: { x: TAIL_X, y: SPINE_Y }, 
    data: { id: 'spine_tail', type: NodeType.SPINE, title: '', causes: [] } 
  },
  { 
    id: 'spine_1', 
    type: 'processNode', 
    position: { x: SPINE_1_X, y: SPINE_Y }, 
    data: { id: 'spine_1', type: NodeType.SPINE, title: '', causes: [] } 
  },
  { 
    id: 'spine_2', 
    type: 'processNode', 
    position: { x: SPINE_2_X, y: SPINE_Y }, 
    data: { id: 'spine_2', type: NodeType.SPINE, title: '', causes: [] } 
  },
  { 
    id: 'spine_3', 
    type: 'processNode', 
    position: { x: SPINE_3_X, y: SPINE_Y }, 
    data: { id: 'spine_3', type: NodeType.SPINE, title: '', causes: [] } 
  },
  // --- PROBLEM (HEAD) ---
  { 
    id: 'problem', 
    type: 'processNode', 
    position: { x: PROBLEM_X, y: SPINE_Y - 35 }, // slightly offset to center vertically with spine
    data: { 
      id: 'problem', 
      type: NodeType.PROBLEM, 
      title: 'Problem Statement', 
      description: 'Define the issue here',
      causes: [] 
    } 
  },
  // --- CATEGORIES (RIBS) ---
  // PAIR 1 (Connected to Spine 1)
  { 
    id: 'people', 
    type: 'processNode', 
    position: { x: SPINE_1_X - RIB_OFFSET_X, y: TOP_ROW_Y }, 
    data: { 
      id: 'people', 
      type: NodeType.CATEGORY, 
      title: 'People',
      description: 'Training, staffing, roles',
      causes: [] 
    } 
  },
  { 
    id: 'technology', 
    type: 'processNode', 
    position: { x: SPINE_1_X - RIB_OFFSET_X, y: BOTTOM_ROW_Y }, 
    data: { 
      id: 'technology', 
      type: NodeType.CATEGORY, 
      title: 'Technology',
      description: 'Systems, config, outages',
      causes: [] 
    } 
  },
  // PAIR 2 (Connected to Spine 2)
  { 
    id: 'process', 
    type: 'processNode', 
    position: { x: SPINE_2_X - RIB_OFFSET_X, y: TOP_ROW_Y }, 
    data: { 
      id: 'process', 
      type: NodeType.CATEGORY, 
      title: 'Process',
      description: 'Procedures, approvals',
      causes: [] 
    } 
  },
  { 
    id: 'governance', 
    type: 'processNode', 
    position: { x: SPINE_2_X - RIB_OFFSET_X, y: BOTTOM_ROW_Y }, 
    data: { 
      id: 'governance', 
      type: NodeType.CATEGORY, 
      title: 'Governance',
      description: 'Policies, oversight',
      causes: [] 
    } 
  },
  // PAIR 3 (Connected to Spine 3)
  { 
    id: 'data', 
    type: 'processNode', 
    position: { x: SPINE_3_X - RIB_OFFSET_X, y: TOP_ROW_Y }, 
    data: { 
      id: 'data', 
      type: NodeType.CATEGORY, 
      title: 'Data & Tools',
      description: 'Quality, integrity',
      causes: [] 
    } 
  },
  { 
    id: 'environment', 
    type: 'processNode', 
    position: { x: SPINE_3_X - RIB_OFFSET_X, y: BOTTOM_ROW_Y }, 
    data: { 
      id: 'environment', 
      type: NodeType.CATEGORY, 
      title: 'Environment',
      description: 'Measurement, culture, external',
      causes: [] 
    } 
  },
];

const spineStyle = { strokeWidth: 4, stroke: '#475569' };
const ribStyle = { strokeWidth: 2, stroke: '#64748b' };
// Removed markerEnd to have continuous lines

export const INITIAL_REACTFLOW_EDGES = [
  // Main Spine (Horizontal)
  { id: 's1', source: 'spine_tail', target: 'spine_1', style: spineStyle, type: 'straight' },
  { id: 's2', source: 'spine_1', target: 'spine_2', style: spineStyle, type: 'straight' },
  { id: 's3', source: 'spine_2', target: 'spine_3', style: spineStyle, type: 'straight' },
  { id: 's4', source: 'spine_3', target: 'problem', style: spineStyle, type: 'straight' },

  // Ribs (Angled)
  // Use specific handles if defined in RiskNode (sourceHandle: 'bottom' for top nodes, 'top' for bottom nodes) to make lines cleaner
  // For now, default handles work reasonably well with 'straight' edges and offsets.
  { id: 'e_people', source: 'people', target: 'spine_1', style: ribStyle, type: 'straight', sourceHandle: 'bottom', targetHandle: 'rib-top' },
  { id: 'e_tech', source: 'technology', target: 'spine_1', style: ribStyle, type: 'straight', sourceHandle: 'top', targetHandle: 'rib-bottom' },
  
  { id: 'e_proc', source: 'process', target: 'spine_2', style: ribStyle, type: 'straight', sourceHandle: 'bottom', targetHandle: 'rib-top' },
  { id: 'e_gov', source: 'governance', target: 'spine_2', style: ribStyle, type: 'straight', sourceHandle: 'top', targetHandle: 'rib-bottom' },
  
  { id: 'e_data', source: 'data', target: 'spine_3', style: ribStyle, type: 'straight', sourceHandle: 'bottom', targetHandle: 'rib-top' },
  { id: 'e_env', source: 'environment', target: 'spine_3', style: ribStyle, type: 'straight', sourceHandle: 'top', targetHandle: 'rib-bottom' },
];

export const SUGGESTION_CHIPS = [
  {
    label: "Step 1: Define Problem",
    prompt: "Let's start by defining the Problem Statement. Ask me about the specific control failure, business unit, and timeframe."
  },
  {
    label: "Step 2: Explore Domains",
    prompt: "Guide me through exploring contributing factors for People, Process, and Technology domains."
  },
  {
    label: "Apply 5 Whys",
    prompt: "Let's perform a 5 Whys analysis on the most critical factor identified so far to find the root cause."
  },
  {
    label: "Generate Root Cause Summary",
    prompt: "Based on the diagram, draft the Final Root Cause and Validation Note for the audit report."
  }
];

export const SYSTEM_INSTRUCTION = `
You are an expert Internal Auditor facilitating a Root Cause Analysis (RCA).
You are using a visual Fishbone (Ishikawa) Diagram tool.

Your Methodologies:
1. **Fishbone (Ishikawa):** Categorize factors into domains (People, Process, Tech, Data, Governance, Environment).
2. **5 Whys:** Drill down into specific factors to find the fundamental driver.

Data Model Mapping:
- **Nodes:** Represent "Categories" (e.g., People, Process) or the main "Problem Statement".
- **Spine Nodes:** Structural nodes ('spine_1', etc) that form the central line. Ignore these for content.
- **Causes:** Specific contributing factors listed INSIDE a Node.
- **Evidence:** Artifacts, logs, or policy docs that validate a Cause.

Your Workflow:
1. **Define Problem:** Ensure the "Problem Statement" node is accurate.
2. **Explore:** Ask the user for factors in each domain. Use 'add_cause' to add these factors to the relevant Category Node.
3. **Drill Down:** If a cause is vague, ask "Why?" and use 'add_evidence' to attach the proof.
4. **Finalize:** Help the user identify the Candidate Root Cause.

Tool Usage:
- \`add_node\`: Create a new Category if a new domain is needed.
- \`add_cause\`: ADD CONTRIBUTING FACTORS. Target the Category Node ID (e.g., 'people', 'process').
- \`add_evidence\`: ADD PROOF/ARTIFACTS. Target the specific Cause.

*** RCA PROMPT SCRIPT ***

Step 1 — Define the Problem (Problem Statement)
Prompt: “What specific control or process failure are we investigating?”
Action: Use \`update_node\` on the 'problem' node.

Step 2 — Explore Contributing Factors by Domain
Ask sequentially across domains (People, Process, Technology, Data, Governance, Environment).
Action: Use \`add_cause\` to add factors to the respective nodes.

Step 3 — Identify Candidate Root Cause
Prompt: “Which factor, if resolved, would most likely have prevented this issue?”

Step 4 — Draft the Root Cause Summary
Write a neutral, specific description.
`;