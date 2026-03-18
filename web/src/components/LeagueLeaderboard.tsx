"use client";

import { useState } from 'react';
import { Trophy, TrendingUp, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Climber = {
  rank: number;
  tier_rank: number;
  name: string;
  username: string;
  score: number;
  top_send: string;
  total_sends: number;
  grade_pyramid: Record<string, number>;
  sends: Array<{ name: string; grade: string; rating: number }>;
  photo_url?: string;
};

type LeagueData = {
  metadata: {
    month: string;
    [key: string]: any;
  };
  leagues: {
    Elite: Climber[];
    Advanced: Climber[];
    Intermediate: Climber[];
    Beginner: Climber[];
  };
};

export default function LeagueLeaderboard({ data }: { data: LeagueData }) {
  const [activeTier, setActiveTier] = useState<'Elite' | 'Advanced' | 'Intermediate' | 'Beginner'>('Intermediate');

  const tiers = ['Elite', 'Advanced', 'Intermediate', 'Beginner'] as const;
  
  const currentTierData = data.leagues[activeTier] || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 mb-6 sm:mb-8">
        {tiers.map((tier) => (
          <button
            key={tier}
            onClick={() => setActiveTier(tier)}
            className={cn(
              "px-3 py-2.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5",
              activeTier === tier 
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 sm:transform sm:scale-105" 
                : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-blue-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700"
            )}
          >
            <span>{tier}</span>
            <span className={cn(
              "px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs",
              activeTier === tier 
                ? "bg-white/20 text-white" 
                : "bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
            )}>
              {data.leagues[tier]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-xl shadow-neutral-200/50 dark:shadow-none border border-neutral-100 dark:border-neutral-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
            {activeTier} League
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {activeTier === 'Elite' && "V8+ Peak Grade"}
            {activeTier === 'Advanced' && "V5-V7 Peak Grade"}
            {activeTier === 'Intermediate' && "V3-V4 Peak Grade"}
            {activeTier === 'Beginner' && "V0-V2 Peak Grade"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500 dark:text-neutral-400 text-xs uppercase font-semibold tracking-wider">
                <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap w-12 sm:w-auto">#</th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">Climber</th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right">Score</th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right hidden sm:table-cell">Top Send</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
              {currentTierData.slice(0, 100).map((climber) => (
                <Row key={climber.username} climber={climber} />
              ))}
              {currentTierData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                    No climbers in this league for {data.metadata.month}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ climber }: { climber: Climber }) {
  const [expanded, setExpanded] = useState(false);

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
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              {climber.photo_url ? (
                <img src={climber.photo_url} alt={climber.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-sm border border-neutral-200 dark:border-neutral-700" />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 dark:text-neutral-400 font-bold text-xs">{climber.name.charAt(0)}</span>
                </div>
              )}
              <span className={cn(
                "absolute -bottom-1 -right-1 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full font-bold text-[9px] sm:text-[10px] border border-white dark:border-neutral-900 shadow-sm",
                climber.tier_rank === 1 ? "bg-yellow-400 text-yellow-900" :
                climber.tier_rank === 2 ? "bg-neutral-300 text-neutral-800" :
                climber.tier_rank === 3 ? "bg-orange-400 text-orange-900" :
                "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
              )}>
                {climber.tier_rank}
              </span>
            </div>
          </div>
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
        <td className="px-4 py-3 sm:px-6 sm:py-4 text-right whitespace-nowrap hidden sm:table-cell">
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            {climber.top_send}
          </span>
        </td>
      </tr>
      
      {expanded && (
        <tr>
          <td colSpan={4} className="p-0 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/20">
            <div className="px-4 sm:px-6 flex flex-col sm:flex-row gap-6 sm:gap-8 py-4 sm:py-6">
              <div className="flex-1 space-y-3 sm:space-y-4">
                <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 sm:gap-2">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> Top Sends this Month
                </h4>
                <div className="grid gap-2">
                  {climber.sends.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-white dark:bg-neutral-800 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
                      <span className="font-medium truncate pr-4 text-neutral-700 dark:text-neutral-300">{s.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold">{s.grade}</span>
                        <span className="font-mono text-neutral-400 dark:text-neutral-500 w-12 text-right">{s.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="w-full sm:w-64 space-y-3 sm:space-y-4">
                <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Grade Pyramid</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(climber.grade_pyramid)
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
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
