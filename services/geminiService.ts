
import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

const apiKey = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// --- Tool Definitions ---

const addNodeTool: FunctionDeclaration = {
  name: 'add_node',
  description: 'Add a new Category (Bone) or Node to the Fishbone diagram.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Title of the Category (e.g. "Governance")' },
      description: { type: Type.STRING, description: 'Optional details' },
      id: { type: Type.STRING, description: 'Optional unique ID. Use "problem" for the head.' }
    },
    required: ['title']
  }
};

const connectNodesTool: FunctionDeclaration = {
  name: 'connect_nodes',
  description: 'Connect a category to the problem statement or another category',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sourceId: { type: Type.STRING, description: 'ID of the category' },
      targetId: { type: Type.STRING, description: 'ID of the problem or parent category' },
      label: { type: Type.STRING, description: 'Optional label' },
    },
    required: ['sourceId', 'targetId']
  }
};

const updateNodeTool: FunctionDeclaration = {
  name: 'update_node',
  description: 'Update a Category or Problem Statement text',
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: 'ID of the node to update' },
      title: { type: Type.STRING, description: 'New title' },
      description: { type: Type.STRING, description: 'New description' },
    },
    required: ['id']
  }
};

const addCauseTool: FunctionDeclaration = {
  name: 'add_cause',
  description: 'Add a Contributing Factor (Cause) to a specific Category Node.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetId: { type: Type.STRING, description: 'ID of the Category Node (e.g. "people", "process")' },
      targetType: { type: Type.STRING, description: 'Usually "NODE"' },
      name: { type: Type.STRING, description: 'The contributing factor or cause' },
      description: { type: Type.STRING, description: 'Details about the factor' },
    },
    required: ['targetId', 'targetType', 'name']
  }
};

const addEvidenceTool: FunctionDeclaration = {
  name: 'add_evidence',
  description: 'Add Evidence, Artifacts, or Mitigations to a specific Cause.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetId: { type: Type.STRING, description: 'ID of the Node containing the cause' },
      targetType: { type: Type.STRING, description: 'Usually "NODE"' },
      causeName: { type: Type.STRING, description: 'The exact name of the Cause to attach this evidence to' },
      name: { type: Type.STRING, description: 'Name of the evidence/artifact' },
      description: { type: Type.STRING, description: 'Description' }
    },
    required: ['targetId', 'targetType', 'causeName', 'name']
  }
};

const clearGraphTool: FunctionDeclaration = {
  name: 'clear_graph',
  description: 'Delete all nodes and edges to start with an empty canvas.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  }
};

export interface GeminiResponse {
  text: string;
  toolCalls?: {
    name: string;
    args: any;
  }[];
}

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  if (!ai) return "";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
             { text: "Transcribe the speech in this audio clip exactly as spoken. Return only the plain text of the transcription." },
             {
               inlineData: {
                 mimeType: mimeType,
                 data: base64Audio
               }
             }
          ]
        }
      ]
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription error:", error);
    return "";
  }
};

export const generateProcessResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  currentMessage: string,
  contextData: string, 
  fileContent?: string 
): Promise<GeminiResponse> => {
  if (!ai) {
    return { text: "API Key not configured. Please ensure process.env.API_KEY is set." };
  }

  try {
    const model = 'gemini-2.5-flash';
    
    let finalUserMessage = `
    Context (Current Fishbone Graph JSON):
    ${contextData}

    User Query: ${currentMessage}
    `;

    if (fileContent) {
      finalUserMessage += `\n\nUploaded Document Content:\n${fileContent}`;
    }

    const contents = [
      ...history,
      { role: 'user', parts: [{ text: finalUserMessage }] }
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{
          functionDeclarations: [
            addNodeTool, 
            connectNodesTool, 
            updateNodeTool, 
            clearGraphTool, 
            addCauseTool, 
            addEvidenceTool
          ]
        }]
      }
    });

    const result: GeminiResponse = {
      text: response.text || "",
      toolCalls: []
    };

    if (response.functionCalls && response.functionCalls.length > 0) {
      result.toolCalls = response.functionCalls.map(call => ({
        name: call.name,
        args: call.args
      }));
    }

    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "I encountered an error processing the request." };
  }
};
