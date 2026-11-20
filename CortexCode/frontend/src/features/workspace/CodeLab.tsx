'use client';

import { useState } from 'react';
import {
  FileCode, Bug, ShieldCheck, RefreshCw, Zap, Bot, Code2, ChevronRight
} from 'lucide-react';

interface CodeFile {
  id: string;
  name: string;
  path: string;
  language: string;
  code: string;
}

const DEFAULT_FILES: CodeFile[] = [
  {
    id: 'f1',
    name: 'App.tsx',
    path: 'src/App.tsx',
    language: 'typescript',
    code: `import React, { useState, useEffect } from 'react';
import { fetchTrainStatus } from './api';

export default function App() {
  const [trainId, setTrainId] = useState('TR-1042');
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    fetchTrainStatus(trainId).then(data => {
      if (isMounted) setStatus(data);
    });
    return () => { isMounted = false; };
  }, [trainId]);

  return (
    <div className="p-6 bg-[#0a0a0a] text-white min-h-screen">
      <h1 className="text-xl font-bold">Live Train Telemetry</h1>
      <p className="text-xs text-neutral-400">Tracking Train ID: {trainId}</p>
      {status ? (
        <div className="mt-4 p-4 bg-[#121212] border border-[#262626] rounded-md">
          <p className="text-xs">Speed: {status.speed} km/h</p>
          <p className="text-xs">Delay: {status.delayMinutes} mins</p>
        </div>
      ) : (
        <p className="text-neutral-500 text-xs mt-4">Connecting to live feed...</p>
      )}
    </div>
  );
}`
  },
  {
    id: 'f2',
    name: 'api.ts',
    path: 'src/api.ts',
    language: 'typescript',
    code: `export async function fetchTrainStatus(trainId: string) {
  const response = await fetch(\`https://api.traintrack.dev/v1/trains/\${trainId}\`);
  if (!response.ok) {
    throw new Error('Failed to fetch telemetry data');
  }
  return response.json();
}`
  },
  {
    id: 'f3',
    name: 'Solution.java',
    path: 'src/Solution.java',
    language: 'java',
    code: `import java.util.HashMap;
import java.util.Map;

public class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        throw new IllegalArgumentException("No two sum solution");
    }
}`
  }
];

export default function CodeLab() {
  const [files, setFiles] = useState<CodeFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>(DEFAULT_FILES[0].id);
  const [selectedText, setSelectedText] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisType, setAnalysisType] = useState<string>('');

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString().trim();
      if (text.length > 5) {
        setSelectedText(text);
      }
    }
  };

  const handleRunAIAction = (action: 'explain' | 'fix' | 'refactor' | 'tests' | 'security') => {
    setAnalyzing(true);
    setAnalysisType(action);
    setAiAnalysis('');

    setTimeout(() => {
      let output = '';
      if (action === 'explain') {
        output = `### Code Explanation\n\n- **Target**: \`${activeFile.name}\`\n- **Summary**: This code executes asynchronous data fetching with a React \`useEffect\` hook and includes an \`isMounted\` flag to prevent state updates after component unmounting.\n\nKey Highlights:\n1. Keeps track of \`isMounted\` boolean flag.\n2. Cleans up memory references on unmount.\n3. Renders conditional JSX elements cleanly.`;
      } else if (action === 'fix') {
        output = `### Root Cause Analysis & Fix\n\n- **Issue**: Potential unhandled Promise rejection if API endpoint fails.\n- **Fix**: Wrapped \`fetchTrainStatus\` call inside a \`try-catch\` block.\n\n\`\`\`typescript\ntry {\n  const data = await fetchTrainStatus(trainId);\n  if (isMounted) setStatus(data);\n} catch (err) {\n  console.error("Telemetry fetch failed", err);\n}\n\`\`\``;
      } else if (action === 'refactor') {
        output = `### Refactored Clean Code\n\n\`\`\`typescript\n// Refactored to use custom hook for cleaner separation of concerns\nfunction useTrainTelemetry(trainId: string) {\n  const [data, setData] = useState<any>(null);\n  useEffect(() => {\n    let active = true;\n    fetchTrainStatus(trainId).then(res => active && setData(res));\n    return () => { active = false; };\n  }, [trainId]);\n  return data;\n}\n\`\`\``;
      } else if (action === 'tests') {
        output = `### Unit Tests (Jest / React Testing Library)\n\n\`\`\`typescript\ndescribe('App Component', () => {\n  it('renders telemetry status correctly', async () => {\n    render(<App />);\n    expect(screen.getByText(/Live Train Telemetry/i)).toBeInTheDocument();\n  });\n});\n\`\`\``;
      } else if (action === 'security') {
        output = `### Security Audit Results\n\n- **Confidence**: 96%\n- **Findings**: 0 High Vulnerabilities found.\n- **Recommendation**: Sanitize user inputs (\`trainId\`) before appending to API query parameters.`;
      }

      setAiAnalysis(output);
      setAnalyzing(false);
    }, 600);
  };

  return (
    <div className="flex-1 flex h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Pane 1: Explorer */}
      <aside className="w-56 bg-[#0d0d0d] border-r border-[#262626] p-3 flex flex-col shrink-0 custom-scrollbar">
        <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider px-2 block mb-2">
          Explorer
        </div>

        <div className="space-y-1">
          {files.map(f => {
            const isActive = f.id === activeFileId;
            return (
              <button
                key={f.id}
                onClick={() => { setActiveFileId(f.id); setSelectedText(''); setAiAnalysis(''); }}
                className={`w-full flex items-center justify-between p-2 rounded text-xs font-mono transition text-left ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white font-semibold border border-[#262626]'
                    : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode size={13} className={isActive ? 'text-blue-400' : 'text-neutral-500'} />
                  <span className="truncate">{f.name}</span>
                </div>
                <ChevronRight size={12} className="text-neutral-600 shrink-0" />
              </button>
            );
          })}
        </div>
      </aside>

      {/* Pane 2: Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] border-r border-[#262626]">
        
        {/* File Header */}
        <div className="px-4 py-2 bg-[#121212] border-b border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-neutral-300">{activeFile.path}</span>
            <span className="text-[10px] uppercase font-mono text-neutral-400 px-1.5 py-0.5 bg-[#1c1c1c] border border-[#262626] rounded">
              {activeFile.language}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleRunAIAction('explain')}
              className="px-2.5 py-1 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs text-neutral-300 hover:text-white rounded transition font-medium"
            >
              Explain
            </button>
            <button
              onClick={() => handleRunAIAction('fix')}
              className="px-2.5 py-1 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs text-neutral-300 hover:text-white rounded transition font-medium"
            >
              Fix Bug
            </button>
            <button
              onClick={() => handleRunAIAction('refactor')}
              className="px-2.5 py-1 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs text-neutral-300 hover:text-white rounded transition font-medium"
            >
              Refactor
            </button>
          </div>
        </div>

        {/* Code Canvas */}
        <div
          onMouseUp={handleTextSelection}
          className="flex-1 p-4 bg-[#070709] overflow-auto font-mono text-xs text-neutral-200 leading-relaxed custom-scrollbar relative select-text"
        >
          {selectedText && (
            <div className="sticky top-2 right-2 z-10 inline-flex items-center gap-2 p-2 bg-[#121212] border border-[#262626] rounded-md text-[11px] text-white shadow-xl animate-fade-in-up">
              <span>Selected {selectedText.length} chars</span>
              <button
                onClick={() => handleRunAIAction('explain')}
                className="px-2 py-0.5 bg-blue-600 rounded text-white font-medium hover:bg-blue-500"
              >
                Explain →
              </button>
            </div>
          )}

          <pre className="whitespace-pre">
            {activeFile.code.split('\n').map((line, idx) => (
              <div key={idx} className="flex hover:bg-[#141414] px-1 rounded font-mono">
                <span className="w-8 shrink-0 text-neutral-600 select-none text-[11px] text-right pr-3 font-mono">{idx + 1}</span>
                <span className="flex-1 text-neutral-200 font-mono">{line}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Pane 3: Assistant */}
      <aside className="w-80 bg-[#0d0d0d] p-4 flex flex-col shrink-0 custom-scrollbar overflow-y-auto">
        <div className="flex items-center justify-between mb-3 border-b border-[#262626] pb-2">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">AI Code Assistant</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => handleRunAIAction('tests')}
            className="p-2 bg-[#121212] border border-[#262626] hover:border-neutral-700 text-left rounded text-xs font-medium text-neutral-300 hover:text-white transition flex items-center gap-1.5"
          >
            <Code2 size={13} className="text-blue-400" />
            Unit Tests
          </button>
          <button
            onClick={() => handleRunAIAction('security')}
            className="p-2 bg-[#121212] border border-[#262626] hover:border-neutral-700 text-left rounded text-xs font-medium text-neutral-300 hover:text-white transition flex items-center gap-1.5"
          >
            <ShieldCheck size={13} className="text-emerald-400" />
            Security Audit
          </button>
        </div>

        {/* Output */}
        <div className="flex-1 bg-[#121212] border border-[#262626] rounded-md p-3.5 font-sans text-xs text-neutral-300 space-y-2 overflow-y-auto custom-scrollbar">
          {analyzing ? (
            <div className="py-8 text-center text-neutral-400 space-y-2">
              <RefreshCw size={20} className="animate-spin text-blue-400 mx-auto" />
              <p className="text-xs font-mono">Analyzing code...</p>
            </div>
          ) : aiAnalysis ? (
            <div className="whitespace-pre-wrap leading-relaxed space-y-2 font-sans">
              <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre className="bg-[#0a0a0a] p-2.5 rounded border border-[#262626] font-mono text-neutral-200 text-[11px] overflow-x-auto"><code>$2</code></pre>') }} />
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500 text-xs">
              Select code or run an action above to inspect analysis.
            </div>
          )}
        </div>
      </aside>

    </div>
  );
}
