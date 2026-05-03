import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Users, Zap, Search, Shield, LayoutDashboard, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8080/api/v1';

interface LeaderboardEntry {
  value: string;
  score: number;
}

const App = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [tournamentStatus, setTournamentStatus] = useState({ success: false, message: '' });
  const [playerId] = useState(`player_${Math.floor(Math.random() * 1000)}`);

  useEffect(() => {
    fetchLeaderboard();
    fetchActiveUsers();
    const interval = setInterval(() => {
      fetchLeaderboard();
      fetchActiveUsers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/leaderboard`);
      setLeaderboard(res.data);
    } catch (e) { console.error("Error fetching leaderboard", e); }
  };

  const fetchActiveUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/analytics/active-users`);
      setActiveUsers(res.data);
    } catch (e) { console.error("Error fetching active users", e); }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      try {
        const res = await axios.get(`${API_BASE}/search/suggest?prefix=${val}`);
        setSuggestions(res.data);
      } catch (e) { console.error("Error suggesting", e); }
    } else {
      setSuggestions([]);
    }
  };

  const joinTournament = async () => {
    try {
      const res = await axios.post(`${API_BASE}/tournaments/T1/join?playerId=${playerId}`);
      setTournamentStatus(res.data);
    } catch (e) { setTournamentStatus({ success: false, message: 'Server Error' }); }
  };

  const submitScore = async () => {
    const score = Math.floor(Math.random() * 1000);
    try {
      await axios.post(`${API_BASE}/scores?playerId=${playerId}&score=${score}`);
      // Register in search index for autocomplete demo
      await axios.post(`${API_BASE}/search/players?name=${playerId}`);
      fetchLeaderboard();
    } catch (e) { console.error("Error submitting score", e); }
  };

  return (
    <div className="min-h-screen p-8 bg-gamer-dark text-white">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gamer-neon rounded-lg text-black">
            <Zap size={24} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Vortex <span className="text-gamer-neon">Platform</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 glass-card px-4 py-2">
            <Users size={18} className="text-gamer-neon" />
            <span className="font-bold">{activeUsers} Active Today</span>
          </div>
          <div className="text-sm font-medium opacity-60">ID: {playerId}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Search */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Autocomplete Section (ZSET Lex) */}
          <section className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4 text-gamer-neon">
              <Search size={20} />
              <h2 className="font-bold uppercase tracking-wider">Player Search</h2>
            </div>
            <div className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Find a gamer..."
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 outline-none focus:border-gamer-neon transition-all"
              />
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute w-full mt-2 glass-card overflow-hidden z-50 shadow-2xl"
                  >
                    {suggestions.map((name, i) => (
                      <div 
                        key={i} 
                        onClick={() => {setSearchQuery(name); setSuggestions([]);}}
                        className="p-3 hover:bg-gamer-neon hover:text-black cursor-pointer transition-colors border-b border-white/5 last:border-0"
                      >
                        {name}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Tournament Section (Redlock) */}
          <section className="glass-card p-6 border-t-4 border-t-gamer-purple">
            <div className="flex items-center gap-2 mb-4 text-gamer-purple">
              <Shield size={20} />
              <h2 className="font-bold uppercase tracking-wider">Epic Tournament</h2>
            </div>
            <p className="text-sm opacity-70 mb-6">High-concurrency entry handled by Redis Distributed Locking (Redlock).</p>
            <button 
              onClick={joinTournament}
              className="w-full py-3 bg-gamer-purple rounded-lg font-black uppercase tracking-widest hover:brightness-125 transition-all shadow-lg active:scale-95"
            >
              Join Tournament
            </button>
            {tournamentStatus.message && (
              <div className={`mt-4 p-3 rounded-md text-center text-sm font-bold ${tournamentStatus.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {tournamentStatus.message}
              </div>
            )}
          </section>

          {/* Action Area */}
          <section className="glass-card p-6 border-l-4 border-l-gamer-neon">
            <h2 className="font-bold uppercase tracking-wider mb-4">Simulate Match</h2>
            <button 
              onClick={submitScore}
              className="w-full py-4 bg-white text-black rounded-lg font-black uppercase flex items-center justify-center gap-2 hover:bg-gamer-neon transition-all"
            >
              <Send size={18} /> Play Match
            </button>
          </section>
        </div>

        {/* Right Column: Global Leaderboard (ZSET) */}
        <div className="lg:col-span-8">
          <section className="glass-card p-8 h-full min-h-[600px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Trophy size={400} />
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-gamer-neon">
                <Trophy size={28} />
                <h2 className="text-2xl font-black uppercase tracking-tighter">Global Leaderboard</h2>
              </div>
              <div className="text-xs uppercase tracking-widest opacity-40">Updates every 5s</div>
            </div>

            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={entry.value?.toString()} 
                  className={`flex items-center justify-between p-4 rounded-xl border border-white/5 transition-all ${index === 0 ? 'bg-gamer-neon/10 border-gamer-neon/30' : 'bg-white/5'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black ${index === 0 ? 'bg-gamer-neon text-black' : 'bg-white/10'}`}>
                      {index + 1}
                    </span>
                    <span className="font-bold text-lg">{entry.value?.toString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-gamer-neon">{entry.score}</span>
                    <span className="text-[10px] uppercase opacity-40 font-bold">PTS</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};

export default App;
