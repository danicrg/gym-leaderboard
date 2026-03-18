import { promises as fs } from 'fs';
import path from 'path';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';

export const revalidate = 60; // Revalidate every 60 seconds (useful for dynamic regeneration if served, but it's statically exported anyway)

export default async function Home() {
  const dataPath = path.join(process.cwd(), '..', 'data', 'leagues-current.json');
  let data = null;
  
  try {
    const fileContents = await fs.readFile(dataPath, 'utf8');
    data = JSON.parse(fileContents);
  } catch (error) {
    console.warn("Failed to load league data:", error);
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center py-6 sm:py-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-4">
            Dogpatch Boulders
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto flex items-center justify-center gap-2">
            Stats & Standings <span className="text-neutral-300 dark:text-neutral-700">&bull;</span> <Link href="/methodology" className="hover:underline text-blue-600 dark:text-blue-400 text-sm font-semibold">How Scoring Works</Link>
          </p>
        </header>
        
        {data ? (
           <DashboardContainer leaguesData={data} />
        ) : (
           <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
             <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">Leaderboard Initializing</h3>
             <p className="text-neutral-500 dark:text-neutral-400">Loading stats from the backend. Please check back later.</p>
           </div>
        )}
      </div>
    </main>
  );
}
