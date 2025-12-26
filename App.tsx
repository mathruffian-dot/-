
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  TeachingMode, 
  TeachingAction, 
  EngagementLevel, 
  ObservationLog, 
  SessionData 
} from './types';
import { 
  StartButtonIcon, 
  StopButtonIcon, 
  SettingsIcon, 
  SparklesIcon 
} from './components/Icons';
import { 
  polishNote, 
  generateReport 
} from './services/geminiService';

const SUBJECTS = ['國文', '英文', '數學', '理化', '社會', '體育', '藝術', '資訊'];

const App: React.FC = () => {
  // Session State
  const [isRunning, setIsRunning] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [activeMode, setActiveMode] = useState<TeachingMode | null>(null);
  const [modeTimers, setModeTimers] = useState<Record<string, number>>({});
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [engagement, setEngagement] = useState<EngagementLevel>(EngagementLevel.MEDIUM);
  const [engagementHistory, setEngagementHistory] = useState<{timestamp: string, level: EngagementLevel}[]>([]);
  
  // UI State
  const [showSummary, setShowSummary] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [lastEngagementPing, setLastEngagementPing] = useState(Date.now());
  const [shouldFlashEngagement, setShouldFlashEngagement] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString('zh-TW', { hour12: false }));

  // Fix: Use 'any' or number for browser-based timers to avoid NodeJS namespace issues in browser environment
  const timerRef = useRef<any>(null);
  const engagementPingRef = useRef<any>(null);

  // System clock update
  useEffect(() => {
    const clock = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Main session timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
        if (activeMode) {
          setModeTimers(prev => ({
            ...prev,
            [activeMode]: (prev[activeMode] || 0) + 1
          }));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, activeMode]);

  // Engagement Reminder logic (5 mins = 300s)
  useEffect(() => {
    if (isRunning) {
      const ping = setInterval(() => {
        const diff = Date.now() - lastEngagementPing;
        if (diff > 5 * 60 * 1000) {
          setShouldFlashEngagement(true);
        }
      }, 10000);
      return () => clearInterval(ping);
    }
  }, [isRunning, lastEngagementPing]);

  const addLog = useCallback((type: ObservationLog['type'], label: string, value?: string | number) => {
    const newLog: ObservationLog = {
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
      type,
      label,
      value
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const handleToggleSession = () => {
    if (!isRunning) {
      // Start
      setIsRunning(true);
      setSessionTime(0);
      setModeTimers({});
      setActionCounts({});
      setLogs([]);
      setEngagementHistory([]);
      addLog('ACTION', '觀課開始', subject);
      setLastEngagementPing(Date.now());
    } else {
      // Stop
      setIsRunning(false);
      addLog('ACTION', '觀課結束');
      setShowSummary(true);
    }
  };

  const handleModeClick = (mode: TeachingMode) => {
    if (!isRunning) return;
    if (activeMode === mode) {
      setActiveMode(null);
      addLog('MODE_CHANGE', '停用', mode);
    } else {
      setActiveMode(mode);
      addLog('MODE_CHANGE', '啟用', mode);
    }
  };

  const handleActionClick = (action: TeachingAction) => {
    if (!isRunning) return;
    setActionCounts(prev => ({
      ...prev,
      [action]: (prev[action] || 0) + 1
    }));
    addLog('ACTION', action);
  };

  const handleEngagementChange = (level: EngagementLevel) => {
    setEngagement(level);
    setLastEngagementPing(Date.now());
    setShouldFlashEngagement(false);
    const ts = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    setEngagementHistory(prev => [...prev, { timestamp: ts, level }]);
    addLog('ENGAGEMENT', '專注度', level);
  };

  const handlePolish = async () => {
    if (!currentNote.trim()) return;
    setIsPolishing(true);
    try {
      const refined = await polishNote(currentNote);
      setCurrentNote(refined);
    } catch (e) {
      alert("AI 潤飾失敗，請檢查網路連線");
    } finally {
      setIsPolishing(false);
    }
  };

  const sendNote = () => {
    if (!currentNote.trim()) return;
    addLog('NOTE', '質性筆記', currentNote);
    setCurrentNote('');
  };

  const handleGenerateAIReport = async () => {
    setIsGeneratingReport(true);
    const data = {
      subject,
      totalDuration: sessionTime,
      modeTimers,
      actionCounts,
      logs,
      engagementHistory
    };
    try {
      const report = await generateReport(data);
      setAiReport(report);
    } catch (e) {
      alert("生成報告失敗，請稍後再試");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const copyToClipboard = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.label}${l.value ? `: ${l.value}` : ''}`).join('\n');
    navigator.clipboard.writeText(text);
    alert("紀錄已複製到剪貼簿");
  };

  const downloadTxt = () => {
    const header = `=== Chronos AI 觀課紀錄 ===\n科目：${subject}\n日期：${new Date().toLocaleDateString()}\n總時長：${formatTime(sessionTime)}\n\n`;
    const text = logs.map(l => `[${l.timestamp}] ${l.label}${l.value ? `: ${l.value}` : ''}`).join('\n');
    const blob = new Blob(["\ufeff" + header + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chronos_Report_${subject}_${new Date().getTime()}.txt`;
    link.click();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto overflow-hidden">
      {/* Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-amber-500/10">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight klimt-gradient bg-clip-text text-transparent">
            Chronos AI
          </h1>
          <select 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)}
            disabled={isRunning}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 focus:border-amber-500 outline-none text-sm transition-all cursor-pointer"
          >
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="text-amber-400 font-mono text-xl tracking-widest hidden sm:block">
            {systemTime}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div onClick={handleToggleSession} className="scale-75 sm:scale-100">
            {isRunning ? <StopButtonIcon /> : <StartButtonIcon />}
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* Left - Teaching Modes */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
            教學模式 <div className="h-px bg-slate-800 flex-1"></div>
          </h2>
          <div className="grid grid-cols-2 gap-4 h-full">
            {Object.values(TeachingMode).map(mode => {
              const isActive = activeMode === mode;
              const elapsed = modeTimers[mode] || 0;
              return (
                <button
                  key={mode}
                  onClick={() => handleModeClick(mode)}
                  className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 overflow-hidden
                    ${isActive 
                      ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                >
                  <span className={`text-lg font-bold ${isActive ? 'text-amber-400' : 'text-slate-300'}`}>{mode}</span>
                  <span className={`font-mono text-sm ${isActive ? 'text-amber-500' : 'text-slate-500'}`}>
                    {formatTime(elapsed)}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 h-1 bg-amber-500 animate-pulse w-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center - Teaching Actions */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
            教學行為 <div className="h-px bg-slate-800 flex-1"></div>
          </h2>
          <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {Object.values(TeachingAction).map(action => {
              const count = actionCounts[action] || 0;
              return (
                <button
                  key={action}
                  onClick={() => handleActionClick(action)}
                  className="group p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-rose-700/50 hover:bg-rose-900/10 transition-all flex items-center justify-between"
                >
                  <span className="font-medium text-slate-200 group-hover:text-rose-400">{action}</span>
                  <div className="px-4 py-1 rounded-full bg-slate-950 border border-slate-800 text-amber-500 font-bold">
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right - Log Stream */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest px-2 flex items-center gap-2">
            即時紀錄流 <div className="h-px bg-slate-800 flex-1"></div>
          </h2>
          <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 overflow-y-auto p-4 flex flex-col gap-3">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-sm">
                等待紀錄中...
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start border-l-2 border-amber-900/30 pl-4 py-1 animate-in slide-in-from-right-2">
                  <span className="text-xs font-mono text-amber-600 mt-1 shrink-0">{log.timestamp}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-300">{log.label}</span>
                    {log.value && <p className="text-xs text-slate-500 break-words max-w-[200px]">{log.value}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className={`glass border-t border-amber-500/10 p-6 flex flex-col md:flex-row gap-6 items-center transition-all ${shouldFlashEngagement ? 'shadow-[0_0_30px_rgba(239,68,68,0.3)] bg-rose-950/20' : ''}`}>
        {/* Engagement */}
        <div className="flex flex-col gap-2 w-full md:w-auto min-w-[240px]">
          <span className={`text-xs font-bold uppercase tracking-widest ${shouldFlashEngagement ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>
            學生專注度 {shouldFlashEngagement && "(請更新紀錄)"}
          </span>
          <div className="flex gap-2">
            {[
              { l: EngagementLevel.HIGH, c: 'bg-emerald-500' },
              { l: EngagementLevel.MEDIUM, c: 'bg-amber-500' },
              { l: EngagementLevel.LOW, c: 'bg-rose-500' }
            ].map(item => (
              <button
                key={item.l}
                onClick={() => handleEngagementChange(item.l)}
                className={`flex-1 py-2 px-4 rounded-xl font-bold transition-all border-2 
                  ${engagement === item.l 
                    ? `${item.c} border-white/20 text-white shadow-lg` 
                    : `bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800`}`}
              >
                {item.l}
              </button>
            ))}
          </div>
        </div>

        {/* Note Input */}
        <div className="flex-1 flex gap-2 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="輸入質性觀察筆記..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 pr-12 focus:border-amber-500/50 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && sendNote()}
            />
            <button 
              onClick={handlePolish}
              disabled={isPolishing || !currentNote.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-amber-500 hover:bg-amber-500/20 transition-all disabled:opacity-30"
              title="AI 魔法潤飾"
            >
              <SparklesIcon className={isPolishing ? "animate-spin" : ""} />
            </button>
          </div>
          <button 
            onClick={sendNote}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95"
          >
            發送
          </button>
        </div>
      </footer>

      {/* Modal - Session Summary & AI Report */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/80">
          <div className="bg-slate-900 border border-amber-500/20 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-bold klimt-gradient bg-clip-text text-transparent">觀課總結報告</h3>
                <p className="text-slate-500">已結束觀課，請選擇操作或生成 AI 報告</p>
              </div>
              <button 
                onClick={() => setShowSummary(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {aiReport ? (
                <div className="prose prose-invert max-w-none prose-amber prose-sm sm:prose-base" 
                     // Fix: Cast window to any to access globally loaded 'marked' library
                     dangerouslySetInnerHTML={{ __html: (window as any).marked.parse(aiReport) }} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Stats */}
                  <div className="space-y-6">
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">基礎資訊</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">學科名稱</span>
                          <span className="text-amber-500 font-bold">{subject}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">觀課時長</span>
                          <span className="text-amber-500 font-bold">{formatTime(sessionTime)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">模式佔比</h4>
                      <div className="space-y-3">
                        {Object.values(TeachingMode).map(m => (
                          <div key={m} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">{m}</span>
                              <span className="text-slate-300">{formatTime(modeTimers[m] || 0)}</span>
                            </div>
                            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-500" 
                                style={{ width: `${sessionTime > 0 ? ((modeTimers[m] || 0) / sessionTime) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">行為累計</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.values(TeachingAction).map(a => (
                          <div key={a} className="flex flex-col">
                            <span className="text-[10px] text-slate-500">{a}</span>
                            <span className="text-xl font-bold text-rose-500">{actionCounts[a] || 0} <span className="text-[10px] font-normal text-slate-600">次</span></span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">專注度曲線</h4>
                      <div className="flex items-end h-20 gap-1">
                        {engagementHistory.map((h, i) => (
                          <div 
                            key={i} 
                            className={`flex-1 rounded-t-sm ${h.level === '高' ? 'bg-emerald-500' : h.level === '中' ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ height: h.level === '高' ? '100%' : h.level === '中' ? '60%' : '30%' }}
                            title={h.timestamp}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <button 
                  onClick={copyToClipboard}
                  className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-2xl font-bold transition-all"
                >
                  複製紀錄
                </button>
                <button 
                  onClick={downloadTxt}
                  className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-2xl font-bold transition-all"
                >
                  下載 TXT
                </button>
              </div>
              
              <button 
                onClick={handleGenerateAIReport}
                disabled={isGeneratingReport || !!aiReport}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isGeneratingReport ? "分析中..." : aiReport ? "報告已生成" : "✨ 生成 AI 觀課報告"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
