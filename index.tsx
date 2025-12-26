
// Add missing imports for React and ReactDOM
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// --- 類型定義 (Types) ---
enum TeachingMode {
  LECTURE = '講述教學',
  GROUP_DISCUSSION = '小組討論',
  PRACTICE = '實作/演算',
  DIGITAL_USE = '數位運用'
}

enum TeachingAction {
  POSITIVE_ENCOURAGEMENT = '正向鼓勵',
  REGULATION = '糾正規範',
  OPEN_QUESTION = '開放提問',
  CLOSED_QUESTION = '封閉提問',
  PATROLLING = '巡視走動'
}

enum EngagementLevel {
  HIGH = '高',
  MEDIUM = '中',
  LOW = '低'
}

interface ObservationLog {
  timestamp: string;
  type: 'MODE_CHANGE' | 'ACTION' | 'ENGAGEMENT' | 'NOTE';
  label: string;
  value?: string | number;
}

// --- 圖標組件 (Icons) ---
const StartButtonIcon = () => (
  <div className="relative w-16 h-16 flex items-center justify-center cursor-pointer group">
    <svg className="absolute inset-0 w-full h-full animate-rotate-slow opacity-60" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" className="text-amber-400" />
    </svg>
    <svg className="w-8 h-8 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transform translate-x-1" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M20,10 L90,50 L20,90 Z" fill="url(#playGrad)" />
    </svg>
  </div>
);

const StopButtonIcon = () => (
  <div className="relative w-16 h-16 flex items-center justify-center cursor-pointer group">
    <div className="absolute inset-0 border border-rose-900/30 rotate-45 scale-90"></div>
    <svg className="w-8 h-8 drop-shadow-[0_0_8px_rgba(127,29,29,0.5)]" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="stopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#b91c1c', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#7f1d1d', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect x="15" y="15" width="70" height="70" rx="4" fill="url(#stopGrad)" />
    </svg>
  </div>
);

const SparklesIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
  </svg>
);

// --- Gemini 服務邏輯 ---
const getGenAI = async () => {
  // Use standard @google/genai import
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

const polishNote = async (note: string): Promise<string> => {
  const ai = await getGenAI();
  const prompt = `你是一位資深的教育教學顧問。請將以下老師記錄的口語筆記，改寫為符合教育學專業術語、結構清晰專業的文字：\n"${note}"`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  return response.text?.trim() || note;
};

const generateReport = async (sessionData: any): Promise<string> => {
  const ai = await getGenAI();
  const prompt = `你是一位教育專家。請根據觀課紀錄 JSON 生成專業 Markdown 報告（包含風格分析、師生互動、專注度趨勢、專業建議與亮點）：\n${JSON.stringify(sessionData, null, 2)}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt
  });
  return response.text || "無法生成報告。";
};

// --- 主程式 (App) ---
const SUBJECTS = ['國文', '英文', '數學', '理化', '社會', '體育', '藝術', '資訊'];

const App = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [activeMode, setActiveMode] = useState<TeachingMode | null>(null);
  const [modeTimers, setModeTimers] = useState<Record<string, number>>({});
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [engagement, setEngagement] = useState<EngagementLevel>(EngagementLevel.MEDIUM);
  const [engagementHistory, setEngagementHistory] = useState<{timestamp: string, level: EngagementLevel}[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [systemTime, setSystemTime] = useState('');

  const timerRef = useRef<any>(null);

  useEffect(() => {
    const clock = setInterval(() => setSystemTime(new Date().toLocaleTimeString('zh-TW', { hour12: false })), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
        if (activeMode) setModeTimers(prev => ({ ...prev, [activeMode]: (prev[activeMode] || 0) + 1 }));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, activeMode]);

  const addLog = useCallback((type: ObservationLog['type'], label: string, value?: string | number) => {
    setLogs(prev => [{
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
      type, label, value
    }, ...prev]);
  }, []);

  const handleToggleSession = () => {
    if (!isRunning) {
      setIsRunning(true); setSessionTime(0); setModeTimers({}); setActionCounts({}); setLogs([]); setEngagementHistory([]);
      addLog('ACTION', '觀課開始', subject);
    } else {
      setIsRunning(false); addLog('ACTION', '觀課結束'); setShowSummary(true);
    }
  };

  const handleActionClick = (action: TeachingAction) => {
    if (!isRunning) return;
    setActionCounts(prev => ({ ...prev, [action]: (prev[action] || 0) + 1 }));
    addLog('ACTION', action);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60); const ss = s % 60;
    return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto overflow-hidden">
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-amber-500/10">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight klimt-gradient bg-clip-text text-transparent">Chronos AI</h1>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isRunning} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 outline-none text-sm text-slate-200">
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="text-amber-400 font-mono text-xl tracking-widest hidden sm:block">{systemTime}</div>
        </div>
        <div onClick={handleToggleSession} className="scale-90 cursor-pointer">{isRunning ? <StopButtonIcon /> : <StartButtonIcon />}</div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">教學模式 <div className="h-px bg-slate-800 flex-1"></div></h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.values(TeachingMode).map(mode => (
              <button key={mode} onClick={() => { if(!isRunning) return; setActiveMode(activeMode === mode ? null : mode); addLog('MODE_CHANGE', activeMode === mode ? '停用' : '啟用', mode); }} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${activeMode === mode ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-slate-800 bg-slate-900'}`}>
                <span className={`text-lg font-bold ${activeMode === mode ? 'text-amber-400' : 'text-slate-300'}`}>{mode}</span>
                <span className="font-mono text-sm text-slate-500">{formatTime(modeTimers[mode] || 0)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">教學行為 <div className="h-px bg-slate-800 flex-1"></div></h2>
          <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {Object.values(TeachingAction).map(action => (
              <button key={action} onClick={() => handleActionClick(action)} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-amber-500/50 flex items-center justify-between">
                <span className="font-medium text-slate-200">{action}</span>
                <div className="px-4 py-1 rounded-full bg-slate-950 text-amber-500 font-bold">{actionCounts[action] || 0}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">即時紀錄流 <div className="h-px bg-slate-800 flex-1"></div></h2>
          <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-4 border-l-2 border-amber-900/30 pl-4 py-1">
                <span className="text-xs font-mono text-amber-600 shrink-0">{log.timestamp}</span>
                <div className="flex flex-col"><span className="text-sm font-bold text-slate-300">{log.label}</span>{log.value && <p className="text-xs text-slate-500">{log.value}</p>}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="glass border-t border-amber-500/10 p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex gap-2 w-full md:w-auto">
          {Object.values(EngagementLevel).map(l => (
            <button key={l} onClick={() => { setEngagement(l); addLog('ENGAGEMENT', '專注度', l); }} className={`flex-1 py-2 px-4 rounded-xl font-bold border-2 ${engagement === l ? 'bg-amber-500 border-amber-400 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 flex gap-2 w-full relative">
          <input type="text" value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} placeholder="質性觀察筆記..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 pr-12 outline-none" />
          <button onClick={async () => { setIsPolishing(true); try { setCurrentNote(await polishNote(currentNote)); } finally { setIsPolishing(false); } }} className="absolute right-20 top-1/2 -translate-y-1/2 p-2 text-amber-500"><SparklesIcon className={isPolishing ? 'animate-spin' : ''} /></button>
          <button onClick={() => { addLog('NOTE', '筆記', currentNote); setCurrentNote(''); }} className="bg-slate-900 px-6 py-3 rounded-2xl font-bold">發送</button>
        </div>
      </footer>

      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/20 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
              <div><h3 className="text-3xl font-bold klimt-gradient bg-clip-text text-transparent">觀課結案報告</h3></div>
              <button onClick={() => setShowSummary(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {aiReport ? <div className="prose prose-invert prose-amber max-w-none" dangerouslySetInnerHTML={{ __html: (window as any).marked.parse(aiReport) }} /> : <p className="text-center text-slate-500">點擊下方按鈕生成 AI 分析</p>}
            </div>
            <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-4">
              <button onClick={async () => { setIsGeneratingReport(true); try { setAiReport(await generateReport({ subject, sessionTime, modeTimers, actionCounts, logs })); } finally { setIsGeneratingReport(false); } }} className="bg-amber-500 text-slate-950 px-8 py-3 rounded-2xl font-bold">{isGeneratingReport ? "分析中..." : "✨ 生成 AI 分析報告"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Use createRoot from react-dom/client and remove global ReactDOM access to fix UMD errors
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
