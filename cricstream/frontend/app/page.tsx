"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Trophy, 
  Users, 
  Activity, 
  History, 
  ChevronRight,
  TrendingUp,
  Target,
  Volume2,
  VolumeX,
  BarChart3
} from "lucide-react";
import { RunRateChart, OverByOverChart } from "./components/Charts";

interface PlayerStats {
  name: string;
  runs: number;
  balls: number;
  overs?: number;
  wickets?: number;
}

export interface MatchUpdate {
  match_id: string;
  innings: number;
  overs: number;
  runs: number;
  wickets: number;
  total_runs: number;
  total_wickets: number;
  striker: PlayerStats;
  non_striker: PlayerStats;
  bowler: PlayerStats;
  event: string;
  commentary_en: string;
  commentary_hi: string;
}

export default function Home() {
  const [matchData, setMatchData] = useState<MatchUpdate | null>(null);
  const [commentaryList, setCommentaryList] = useState<MatchUpdate[]>([]);
  const [connected, setConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true); 
  const isMutedRef = useRef(true); 
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const languageRef = useRef<'en' | 'hi'>('en');
  const ws = useRef<WebSocket | null>(null);

  // Load voices proactively
  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  const speak = (data: MatchUpdate) => {
    if (isMutedRef.current) return;
    
    // We removed speechSynthesis.cancel() here so that if balls 
    // arrive slightly faster than expected, the audio queues up.
    
    const text = languageRef.current === 'en' ? data.commentary_en : data.commentary_hi;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find an appropriate voice
    const voices = window.speechSynthesis.getVoices();
    let voice = null;
    
    if (languageRef.current === 'en') {
      // Try to find an Indian English male voice for Ravi Shastri style
      voice = voices.find(v => v.lang.includes('en-IN') && v.name.includes('Male')) || 
              voices.find(v => v.lang.includes('en-IN')) ||
              voices.find(v => v.lang.includes('en'));
    } else {
      // Try to find a Hindi voice for Aakash Chopra style
      voice = voices.find(v => v.lang.includes('hi-IN')) || 
              voices.find(v => v.lang.includes('hi'));
    }
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = languageRef.current === 'hi' ? 0.95 : 1.0; // Slow down Hindi slightly
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const connect = () => {
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log("Connected to CricStream WebSocket");
        setConnected(true);
      };

      ws.current.onmessage = (event) => {
        const data: MatchUpdate = JSON.parse(event.data);
        setMatchData(data);
        setCommentaryList((prev) => [data, ...prev].slice(0, 50));
        
        // Trigger audio commentary
        speak(data);
      };

      ws.current.onclose = () => {
        console.log("Disconnected. Reconnecting...");
        setConnected(false);
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      ws.current?.close();
    };
  }, []);

  if (!matchData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="live-dot mb-4 h-4 w-4"></div>
          <h1 className="text-4xl font-bold mb-2">CricStream</h1>
          <p className="text-slate-400">Waiting for live match data...</p>
          {!connected && <p className="text-red-400 mt-2 text-sm">Server not reachable. Please wait.</p>}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Trophy size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">IND vs AUS</h1>
              <p className="text-slate-400 text-sm">T20 International - Match 1</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => { setLanguage('en'); languageRef.current = 'en'; }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                EN (Ravi Shastri)
              </button>
              <button
                onClick={() => { setLanguage('hi'); languageRef.current = 'hi'; }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'hi' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                HI (Aakash Chopra)
              </button>
            </div>
            <div className="flex items-center px-4 py-2 bg-slate-900 border border-slate-700 rounded-full">
              <span className="live-dot"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Live</span>
            </div>
            <button 
              onClick={() => {
                const newMutedState = !isMuted;
                setIsMuted(newMutedState);
                isMutedRef.current = newMutedState; // Update the ref immediately
                
                if (!newMutedState) {
                  window.speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance("Audio commentary enabled.");
                  window.speechSynthesis.speak(utterance);
                } else {
                  window.speechSynthesis.cancel();
                }
              }}
              className={`p-2 rounded-full border transition-all ${isMuted ? 'border-slate-700 text-slate-500' : 'border-indigo-500 text-indigo-400 bg-indigo-500/10'}`}
              title={isMuted ? "Unmute commentary" : "Mute commentary"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-widest">Target</p>
              <p className="font-bold">Not Set</p>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Scoreboard & Stats */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Scorecard Card */}
            <div className="card-premium p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Target size={120} />
              </div>
              <div className="flex flex-col md:flex-row md:items-end gap-6 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-black text-indigo-400">{matchData.total_runs}</span>
                  <span className="text-4xl font-bold text-slate-500">/ {matchData.total_wickets}</span>
                </div>
                <div className="flex flex-col pb-2">
                  <span className="text-xl font-medium text-slate-300">Overs: {matchData.overs}</span>
                  <span className="text-sm text-slate-500">RR: {(matchData.total_runs / (matchData.overs || 0.1)).toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-8 flex gap-2">
                <span className="badge bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Innings 1</span>
                <span className="badge bg-green-500/20 text-green-400 border border-green-500/30">Good Form</span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-premium p-6">
                <div className="flex items-center gap-2 mb-2 text-indigo-400">
                  <TrendingUp size={18} />
                  <h3 className="font-semibold text-sm tracking-wider uppercase">Run Progression</h3>
                </div>
                <RunRateChart data={commentaryList} />
              </div>
              <div className="card-premium p-6">
                <div className="flex items-center gap-2 mb-2 text-emerald-400">
                  <BarChart3 size={18} />
                  <h3 className="font-semibold text-sm tracking-wider uppercase">Runs Per Over</h3>
                </div>
                <OverByOverChart data={commentaryList} />
              </div>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Batting Stats */}
              <div className="card-premium p-6">
                <div className="flex items-center gap-2 mb-4 text-slate-400 uppercase text-xs font-bold">
                  <Users size={16} />
                  <span>Batting</span>
                </div>
                <div className="space-y-4">
                  {[matchData.striker, matchData.non_striker].map((player, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/50">
                      <div>
                        <p className={`font-bold ${idx === 0 ? 'text-indigo-300' : 'text-slate-300'}`}>
                          {player.name} {idx === 0 && "*"}
                        </p>
                        <p className="text-xs text-slate-500">SR: {((player.runs / (player.balls || 1)) * 100).toFixed(1)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black">{player.runs}</p>
                        <p className="text-xs text-slate-500">{player.balls} balls</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bowling Stats */}
              <div className="card-premium p-6">
                <div className="flex items-center gap-2 mb-4 text-slate-400 uppercase text-xs font-bold">
                  <Activity size={16} />
                  <span>Current Bowler</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-900/50">
                  <div>
                    <p className="font-bold text-indigo-300">{matchData.bowler.name}</p>
                    <p className="text-xs text-slate-500">Econ: {(matchData.bowler.runs / (matchData.bowler.overs || 0.1)).toFixed(1)}</p>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <p className="text-xl font-black">{matchData.bowler.wickets}</p>
                      <p className="text-xs text-slate-500">Wkt</p>
                    </div>
                    <div>
                      <p className="text-xl font-black">{matchData.bowler.runs}</p>
                      <p className="text-xs text-slate-500">Runs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Commentary */}
          <div className="card-premium flex flex-col h-[600px]">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 uppercase text-xs font-bold">
                <History size={16} />
                <span>Live Commentary</span>
              </div>
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrolling-list space-y-6">
              {commentaryList.map((update, idx) => (
                <div key={idx} className="relative pl-6 border-l border-slate-700 group">
                  <div className={`absolute -left-[5px] top-0 h-2 w-2 rounded-full ${idx === 0 ? 'bg-indigo-500 scale-150 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-700'}`}></div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500">{update.overs}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                      update.event.includes('WICKET') ? 'bg-red-500/20 text-red-400' : 
                      update.event.includes('4') || update.event.includes('6') ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      {update.event}
                    </span>
                  </div>
                  <p className={`text-sm ${idx === 0 ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                    {language === 'en' ? update.commentary_en : update.commentary_hi}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <footer className="text-center text-slate-600 text-xs py-8">
          <p>© 2026 CricStream Real-Time Services. Powered by FastAPI & Redis Pub/Sub.</p>
        </footer>
      </div>
    </main>
  );
}
