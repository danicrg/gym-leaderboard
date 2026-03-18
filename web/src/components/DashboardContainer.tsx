"use client";

import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LeagueLeaderboard from './LeagueLeaderboard';
import LiveLeaderboard from './LiveLeaderboard';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DashboardContainer({ leaguesData }: { leaguesData: any }) {
  const [activeTab, setActiveTab] = useState<'monthly' | 'live'>('monthly');

  return (
    <div className="space-y-6">
      <div className="flex justify-center mb-4">
        <div className="bg-white dark:bg-neutral-800 p-1 rounded-xl sm:rounded-2xl flex gap-1 shadow-sm border border-neutral-200 dark:border-neutral-700 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('monthly')}
            className={cn(
              "flex-1 sm:flex-none uppercase tracking-wide text-xs sm:text-sm font-bold px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all whitespace-nowrap",
              activeTab === 'monthly'
                ? "bg-blue-600 text-white shadow-md"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
            )}
          >
            Monthly Leagues
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={cn(
               "flex-1 sm:flex-none uppercase tracking-wide text-xs sm:text-sm font-bold px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all whitespace-nowrap",
               activeTab === 'live'
                ? "bg-blue-600 text-white shadow-md"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
            )}
          >
            Live Leaderboard
          </button>
        </div>
      </div>

      <div className="transition-opacity duration-300">
        {activeTab === 'monthly' ? (
          <LeagueLeaderboard data={leaguesData} />
        ) : (
          <LiveLeaderboard />
        )}
      </div>
    </div>
  );
}
