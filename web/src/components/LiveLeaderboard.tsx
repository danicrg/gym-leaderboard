"use client";

import { useState, useEffect, useMemo } from 'react';
import { Search, Trophy, TrendingUp, TrendingDown, Layers, Flame, User, SearchX } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Climber = {
  rank: number;
  name: string;
  username: string;
  user_id?: string;
  score: number;
  top_send: string;
  total_sends: number;
  grade_pyramid: Record<string, number>;
  sends: Array<{ name: string; grade: string; rating: number; slug?: string }>;
  movement: number | 'NEW';
};

type Metadata = {
  generated_at: string;
  gym_id: string;
  gym_name: string;
  climb_of_the_week?: {
    slug: string;
    name: string;
    grade: string;
    adjusted_rating: number;
    num_senders: number;
  };
};

function gradeToNum(g: string) {
  if (!g) return -1;
  const m = g.toLowerCase().replace('v', '').trim();
  if (m === '?') return -1;
  const parts = m.split('-');
  return parseInt(parts[parts.length - 1]) || 0;
}

export default function LiveLeaderboard() {
  const [timeWindow, setTimeWindow] = useState<'30' | '14' | '7'>('30');
  const [data, setData] = useState<Climber[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [scoreHistory, setScoreHistory] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  
  const [visibleCount, setVisibleCount] = useState(50);

  // Fetch data
  useEffect(() => {
    let active = true;
    setLoading(true);
    
    Promise.all([
      fetch(`/api/leaderboard?window=${timeWindow}`).then(r => r.json()),
      fetch(`/api/history`).then(r => r.json()).catch(() => ({}))
    ]).then(([leaderboardRes, historyRes]) => {
      if (!active) return;
      
      if (Array.isArray(leaderboardRes)) {
        setData(leaderboardRes);
        setMetadata(null);
      } else {
        setData(leaderboardRes.leaderboard || []);
        setMetadata(leaderboardRes.metadata || null);
      }
      setScoreHistory(historyRes || {});
      setLoading(false);
      setVisibleCount(50);
    }).catch(err => {
      console.error(err);
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [timeWindow]);

  // Derived filtered data
  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    const minNum = gradeFilter ? gradeToNum(gradeFilter) : -1;
    
    return data.filter(row => {
      if (q && !row.name.toLowerCase().includes(q) && !row.username.toLowerCase().includes(q)) return false;
      if (minNum >= 0 && gradeToNum(row.top_send) < minNum) return false;
      return true;
    });
  }, [data, search, gradeFilter]);

  const displayedClimbers = filteredData.slice(0, visibleCount);
  const isFiltering = search.length > 0 || gradeFilter !== '';

  const handleLoadMore = () => setVisibleCount(c => c + 50);

  // Podium
  const podiumTop3 = !isFiltering && data.length >= 3 ? data.slice(0, 3) : [];
  
  // Movers
  const movers = useMemo(() => {
    if (isFiltering || data.length < 10) return { risers: [], fallers: [] };
    const numeric = data.filter(r => typeof r.movement === 'number' && r.movement !== 0);
    const risers = [...numeric].sort((a, b) => (b.movement as number) - (a.movement as number)).slice(0, 3);
    const fallers = [...numeric].sort((a, b) => (a.movement as number) - (b.movement as number)).slice(0, 3);
    return { risers, fallers };
  }, [data, isFiltering]);

  const cotw = metadata?.climb_of_the_week;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex justify-center mb-6">
        <div className="bg-white dark:bg-neutral-800 p-1 rounded-xl flex gap-1 shadow-sm border border-neutral-200 dark:border-neutral-700 w-full sm:w-auto overflow-x-auto">
          {(['7', '14', '30'] as const).map(w => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={cn(
                "flex-1 sm:flex-none uppercase tracking-wide text-xs font-bold px-4 sm:px-6 py-2 rounded-lg transition-all whitespace-nowrap",
                timeWindow === w
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-md"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
              )}
            >
              {w} Days
            </button>
          ))}
        </div>
      </div>

      {!isFiltering && cotw && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 sm:p-5 flex items-center gap-4 sm:gap-5 shadow-sm">
          <div className="bg-white dark:bg-black/20 p-3 rounded-full shadow-sm shrink-0">
            <Flame className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 dark:text-orange-400" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5">Climb of the Week</div>
            <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">{cotw.name}</div>
            <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-semibold">{cotw.grade.toUpperCase()}</span>
              <span className="opacity-50">•</span>
              <span>Rating: {cotw.adjusted_rating}</span>
              <span className="opacity-50">•</span>
              <span>{cotw.num_senders} sender{cotw.num_senders !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Podium */}
      {podiumTop3.length === 3 && (
         <div className="flex justify-center items-end gap-2 sm:gap-4 my-8 min-h-[160px] sm:min-h-[180px]">
           {[1, 0, 2].map((idx) => {
             const r = podiumTop3[idx];
             const isGold = idx === 0;
             const isSilver = idx === 1;
             return (
               <div key={r.username} className={cn(
                 "flex-1 max-w-[160px] sm:max-w-[200px] rounded-2xl p-3 sm:p-4 text-center border shadow-sm relative transition-transform hover:-translate-y-1",
                 isGold ? "bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/20 border-yellow-300 dark:border-yellow-700 h-[140px] sm:h-[160px] z-10 scale-105" :
                 isSilver ? "bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-slate-300 dark:border-slate-700 h-[120px] sm:h-[130px]" :
                 "bg-gradient-to-br from-orange-50 to-orange-100/80 dark:from-orange-950/40 dark:to-orange-900/30 border-orange-200 dark:border-orange-800 h-[110px] sm:h-[120px]"
               )}>
                 <div className="text-2xl sm:text-3xl mb-1 sm:mb-2 -mt-6 sm:-mt-8 drop-shadow-md">
                   {isGold ? '🥇' : isSilver ? '🥈' : '🥉'}
                 </div>
                 <div className="font-bold text-xs sm:text-sm truncate text-neutral-900 dark:text-neutral-100">{r.name}</div>
                 <div className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 truncate mb-1 sm:mb-2">@{r.username}</div>
                 <div className="font-mono font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">{r.score}</div>
               </div>
             )
           })}
         </div>
      )}

      {/* Movers */}
      {!isFiltering && movers.risers.length > 0 && (
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {/* Risers */}
           <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm">
             <div className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-500 mb-3 flex items-center gap-1.5">
               <TrendingUp className="w-4 h-4" /> Biggest Risers
             </div>
             <div className="space-y-2">
               {movers.risers.map(r => (
                 <div key={r.username} className="flex justify-between items-center text-sm py-1 border-b border-neutral-100 dark:border-neutral-700/50 last:border-0">
                   <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate pr-2">{r.name}</span>
                   <span className="font-bold text-green-600 dark:text-green-500 shrink-0">▲ {r.movement}</span>
                 </div>
               ))}
             </div>
           </div>
           
           {/* Fallers */}
           {movers.fallers.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-500 mb-3 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" /> Biggest Fallers
              </div>
              <div className="space-y-2">
                {movers.fallers.map(r => (
                  <div key={r.username} className="flex justify-between items-center text-sm py-1 border-b border-neutral-100 dark:border-neutral-700/50 last:border-0">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate pr-2">{r.name}</span>
                    <span className="font-bold text-red-600 dark:text-red-500 shrink-0">▼ {Math.abs(r.movement as number)}</span>
                  </div>
                ))}
              </div>
            </div>
           )}
         </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-neutral-400 text-neutral-900 dark:text-neutral-100"
          />
        </div>
        <select 
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          className="w-full sm:w-40 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer text-neutral-900 dark:text-neutral-100"
        >
          <option value="">All Grades</option>
          {['v10', 'v9', 'v8', 'v7', 'v6', 'v5', 'v4', 'v3'].map(g => (
            <option key={g} value={g}>{g.toUpperCase()}+</option>
          ))}
        </select>
      </div>

      {isFiltering && (
         <div className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2">
            Found {filteredData.length} climbers
         </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-xl shadow-neutral-200/50 dark:shadow-none border border-neutral-100 dark:border-neutral-700 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-neutral-500 flex flex-col items-center justify-center space-y-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p>Loading leaderboard...</p>
           </div>
        ) : displayedClimbers.length === 0 ? (
           <div className="p-12 text-center text-neutral-500 flex flex-col items-center justify-center space-y-3">
              <SearchX className="w-8 h-8 opacity-50" />
              <p>No climbers found matching your filters.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-xs uppercase font-semibold tracking-wider">
                  <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap w-12 sm:w-auto">#</th>
                  <th className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Climber</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">Score</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right hidden lg:table-cell">Top Send</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center hidden md:table-cell w-24">Trend</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right">Move</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                {displayedClimbers.map((climber) => (
                  <ExpandableRow 
                    key={climber.username} 
                    climber={climber} 
                    history={scoreHistory} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {!loading && displayedClimbers.length < filteredData.length && (
         <div className="flex justify-center pt-4">
           <button 
             onClick={handleLoadMore}
             className="px-6 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-sm"
           >
             Load More
           </button>
         </div>
      )}
    </div>
  );
}

function ExpandableRow({ climber, history }: { climber: Climber, history: any }) {
  const [expanded, setExpanded] = useState(false);

  let moveHtml = <span className="text-neutral-400 dark:text-neutral-500">-</span>;
  if (climber.movement === 'NEW') {
      moveHtml = <span className="text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">NEW</span>;
  } else if (climber.movement > 0) {
      moveHtml = <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-500">▲ {climber.movement}</span>;
  } else if (climber.movement < 0) {
      moveHtml = <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-500">▼ {Math.abs(climber.movement)}</span>;
  }

  // Sparklines
  const sparklineSVG = useMemo(() => {
    const dates = Object.keys(history).sort();
    if (dates.length < 2) return null;
    const values = dates.map(d => history[d]?.[climber.username] || 0).filter(v => v > 0);
    if (values.length < 2) return null;

    const w = 60, h = 20, pad = 2;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
        const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
        return `${x},${y}`;
    }).join(' ');

    const trending = values[values.length - 1] >= values[0];
    const color = trending ? '#10b981' : '#ef4444'; // green-500 / red-500

    return (
       <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block overflow-visible">
          <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points}/>
       </svg>
    );
  }, [history, climber]);

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "group transition-colors cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/30",
          expanded && "bg-blue-50/50 dark:bg-blue-900/10"
        )}
      >
        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap w-12 sm:w-auto">
           <span className="font-bold text-neutral-500 dark:text-neutral-400">#{climber.rank}</span>
        </td>
        <td className="px-2 sm:px-6 py-3 sm:py-4 max-w-[130px] sm:max-w-xs md:max-w-sm truncate">
          <div className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {climber.name}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">@{climber.username}</div>
        </td>
        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
          <div className="font-mono font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
            {climber.score.toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-end gap-1">
            <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {climber.total_sends}<span className="hidden sm:inline"> sends</span>
          </div>
        </td>
        <td className="px-4 py-3 sm:px-6 sm:py-4 text-right whitespace-nowrap hidden lg:table-cell">
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            {climber.top_send}
          </span>
        </td>
        <td className="px-4 py-3 sm:px-6 sm:py-4 text-center whitespace-nowrap hidden md:table-cell w-24">
           {sparklineSVG}
        </td>
        <td className="px-4 py-3 sm:px-6 sm:py-4 text-right whitespace-nowrap">
           {moveHtml}
        </td>
      </tr>
      
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/20">
            <div className="px-4 sm:px-6 flex flex-col sm:flex-row gap-6 sm:gap-8 py-4 sm:py-6">
              <div className="flex-1 space-y-3 sm:space-y-4">
                <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 sm:gap-2">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> Top Sends Included in Score
                </h4>
                <div className="grid gap-2">
                  {climber.sends && climber.sends.length > 0 ? climber.sends.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-white dark:bg-neutral-800 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
                      <span className="font-medium truncate pr-4 text-neutral-700 dark:text-neutral-300">
                          {s.slug ? (
                              <a href={`https://kaya-app.kayaclimb.com/climb/${s.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 hover:underline">
                                  {s.name}
                              </a>
                          ) : s.name}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold">{s.grade}</span>
                        <span className="font-mono text-neutral-400 dark:text-neutral-500 w-12 text-right">{s.rating}</span>
                      </div>
                    </div>
                  )) : (
                     <div className="text-sm text-neutral-500">No recent sends available.</div>
                  )}
                </div>
              </div>
              
              <div className="w-full sm:w-64 space-y-3 sm:space-y-4">
                <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Grade Pyramid</h4>
                <div className="flex flex-wrap gap-2">
                  {climber.grade_pyramid && Object.keys(climber.grade_pyramid).length > 0 ? Object.entries(climber.grade_pyramid)
                    .sort((a, b) => {
                       const ga = parseInt(a[0].replace(/[^0-9]/g, '')) || 0;
                       const gb = parseInt(b[0].replace(/[^0-9]/g, '')) || 0;
                       return gb - ga;
                    })
                    .map(([grade, count]) => (
                    <div key={grade} className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
                      <span className="font-bold text-sm text-neutral-700 dark:text-neutral-300">{grade}</span>
                      <span className="flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold min-w-[20px] rounded-full px-1.5 py-0.5">
                        {count}
                      </span>
                    </div>
                  )) : (
                     <div className="text-sm text-neutral-500">No grades logged.</div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
