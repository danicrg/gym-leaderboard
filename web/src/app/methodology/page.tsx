import Link from 'next/link';

export const metadata = {
  title: 'How Scoring Works — Dogpatch Boulders',
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white dark:bg-neutral-900 shadow-xl shadow-neutral-200/50 dark:shadow-none border border-neutral-100 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-6 sm:p-10 mb-12">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            &larr; Back to Leaderboard
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-3 tracking-tight">
          How Scoring Works
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed">
          A plain-language guide to how we rank climbers at Dogpatch Boulders. No math degree required.
        </p>

        {/* TLDR */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-6 mb-12 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">TL;DR</h3>
          <ol className="list-decimal pl-5 space-y-2 text-neutral-700 dark:text-neutral-300 text-sm sm:text-base">
            <li>Every climb starts with a base score from its <strong className="text-blue-700 dark:text-blue-400">V-grade</strong> (V0 = 1000, V6 = 1600, V10 = 2000)</li>
            <li>Climbs get <strong className="text-blue-700 dark:text-blue-400">adjusted up or down</strong> based on who actually sends them</li>
            <li>Your score is almost entirely your <strong className="text-blue-700 dark:text-blue-400">single hardest send</strong>, with tiny bonuses for additional climbs</li>
            <li>Only the <strong className="text-blue-700 dark:text-blue-400">last 30 days</strong> count &mdash; you're only as strong as your last month</li>
          </ol>
        </div>

        <div className="space-y-16">
          {/* SECTION: The Big Idea */}
          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-neutral-900 dark:text-white mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-xl shrink-0">&#x1F3AF;</span>
              The Big Idea
            </h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400 space-y-4">
              <p>The leaderboard answers one question: <strong>"Who is the strongest climber at Dogpatch right now?"</strong></p>
              <p>To answer that fairly, we can't just look at the grade printed on the wall. Everyone knows some V6s are sandbagged and others are soft. So we let the <em>community</em> define how hard each climb really is, then score you based on that.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 my-8">
              <div className="text-center p-3 sm:px-4 sm:py-3 rounded-xl border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 font-semibold text-sm w-40">Climbers define<br/>climb difficulty</div>
              <div className="text-neutral-400 font-bold rotate-90 sm:rotate-0">&rarr;</div>
              <div className="text-center p-3 sm:px-4 sm:py-3 rounded-xl border-2 border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 font-semibold text-sm w-40">Climb difficulty defines<br/>climber scores</div>
              <div className="text-neutral-400 font-bold rotate-90 sm:rotate-0">&rarr;</div>
              <div className="text-center p-3 sm:px-4 sm:py-3 rounded-xl border-2 border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 font-semibold text-sm w-40">Repeat until<br/>scores stabilize</div>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400">
              <p>Strong climbers sending a climb pushes its difficulty rating up. Weaker climbers sending it pulls it down. Your score then reflects the <em>actual</em> difficulty of what you've sent, not just what the setter wrote on the tag.</p>
            </div>
          </section>

          {/* SECTION: Your Score = Your Hardest Sends */}
          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-neutral-900 dark:text-white mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 text-xl shrink-0">&#x1F4AA;</span>
              Your Score = Your Hardest Sends
            </h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400 space-y-4 mb-6">
              <p>Your score is a <strong>weighted sum</strong> of your climbs, sorted hardest-first. But the weights drop off <em>extremely fast</em> &mdash; your second-best climb is only worth 10% of your best, your third is worth 1%, and so on.</p>
            </div>

            <div className="space-y-3 my-8">
              {[
                { rank: '#1', width: '100%', label: 'Hardest send', pct: '100%', opacity: 1 },
                { rank: '#2', width: '10%', label: '', pct: '10%', opacity: 0.8 },
                { rank: '#3', width: '3%', label: '', pct: '1%', opacity: 0.6 },
                { rank: '#4', width: '2%', label: '', pct: '0.1%', opacity: 0.4 },
                { rank: '#5+', width: '1.5%', label: '', pct: '~0%', opacity: 0.2 },
              ].map(w => (
                <div key={w.rank} className="flex items-center gap-3">
                  <div className="w-8 text-xs font-semibold text-neutral-400 text-center">{w.rank}</div>
                  <div className="flex-1 h-7 bg-neutral-100 dark:bg-neutral-800 rounded-md relative overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-md flex items-center px-3 min-w-[3px]" style={{ width: w.width, opacity: w.opacity }}>
                      {w.label && <span className="text-white text-xs font-bold">{w.label}</span>}
                    </div>
                  </div>
                  <div className="w-12 text-right font-mono text-xs text-neutral-500">{w.pct}</div>
                </div>
              ))}
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400 mb-6">
              <p>In practice, your score is <em>almost entirely</em> determined by your single hardest send. Additional climbs act as tiebreakers &mdash; they nudge your score up slightly, but they can never drag it down.</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 sm:p-5 rounded-r-xl text-sm text-neutral-700 dark:text-neutral-300">
              <strong className="text-neutral-900 dark:text-white">Why?</strong> We want the leaderboard to reflect peak ability, not gym attendance. Logging your warmups will never hurt you, but it won't significantly help either. This is similar to how competition redpoint rounds work, but with steeper decay.
            </div>
          </section>

          {/* SECTION: Volume Can't Beat Difficulty */}
          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-neutral-900 dark:text-white mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-xl shrink-0">&#x1F3CB;</span>
              Volume Can't Beat Difficulty
            </h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400 mb-6">
              <p>Here's the key design choice: <strong>no amount of easier climbs can overtake a harder one.</strong> Let's see this in action:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <div className="border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-xl p-5">
                 <div className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider mb-1">Winner</div>
                 <div className="font-bold text-lg text-neutral-900 dark:text-white mb-1">Climber A</div>
                 <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">Sent 1 V6</div>
                 <div className="font-mono text-3xl font-bold text-green-600 dark:text-green-500 tracking-tight">1,600</div>
              </div>
              <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 rounded-xl p-5">
                 <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Loses</div>
                 <div className="font-bold text-lg text-neutral-900 dark:text-white mb-1">Climber B</div>
                 <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">Sent 40 V4s</div>
                 <div className="font-mono text-3xl font-bold text-neutral-400 tracking-tight">~1,555</div>
              </div>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400 mb-6">
              <p>Why? Because of the steep 10% decay, Climber B's 40 V4s form a geometric series that <em>converges</em> &mdash; it has a mathematical ceiling it can never cross:</p>
            </div>

            <div className="space-y-3 shadow-inner bg-neutral-50 dark:bg-neutral-900/50 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800">
               {[
                 { label: '1 V6', color: 'bg-green-500', w: '80%', val: '1,600', isBold: true },
                 { label: '1 V4', color: 'bg-blue-500', w: '70%', val: '1,400' },
                 { label: '5 V4s', color: 'bg-blue-500', w: '75.5%', val: '1,555' },
                 { label: '40 V4s', color: 'bg-blue-500', w: '75.5%', val: '~1,555' },
                 { label: 'Infinite V4s', color: 'bg-blue-400', w: '75.5%', val: '1,555', italic: true, op: 'opacity-60' },
               ].map(b => (
                 <div key={b.label} className="flex items-center gap-3">
                    <div className={cn("w-20 text-right text-xs text-neutral-500", b.isBold && "font-bold text-neutral-900 dark:text-white", b.italic && "italic")}>{b.label}</div>
                    <div className="flex-1 h-7 bg-neutral-200 dark:bg-neutral-800 rounded-md relative overflow-hidden">
                       <div className={cn("h-full rounded-md", b.color, b.op)} style={{ width: b.w }} />
                    </div>
                    <div className="w-14 text-left font-mono font-bold text-xs text-neutral-900 dark:text-white">{b.val}</div>
                 </div>
               ))}
            </div>

            <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 sm:p-5 rounded-r-xl text-sm text-neutral-700 dark:text-neutral-300">
              <strong className="text-neutral-900 dark:text-white">The math ceiling:</strong> With a 10% decay factor, your maximum possible score from infinite sends of the same grade is capped at <strong>~1.11x</strong> the value of a single send at that grade. 40 V4s and infinite V4s produce nearly identical scores.
            </div>
          </section>

          {/* SECTION: Not All V6s Are Equal */}
          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-neutral-900 dark:text-white mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-xl shrink-0">&#x2696;&#xFE0F;</span>
              Not All V6s Are Equal
            </h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400 space-y-4 mb-8">
              <p>You already know this intuitively: that one black V6 in the corner feels way harder than the popular pink V6 everyone warms up on. Our system captures this.</p>
              <p>Each climb's rating starts at its posted grade, then gets adjusted based on <strong>who sends it</strong> and <strong>how many people</strong> send it.</p>
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">How a "popular" V6 loses points</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-base">If a V6 is getting sent by lots of V4 and V5 climbers, the system recognizes it's probably softer than a true V6. The climb's effective rating gets pulled down toward the average strength of its senders.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 my-8">
               <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-xl text-center min-w-[130px]">
                 <div className="font-mono text-xl font-bold mb-1">1,600</div>
                 <div className="text-xs text-neutral-500">V6 base</div>
               </div>
               <div className="text-xl font-bold text-neutral-400 rotate-90 sm:rotate-0">+</div>
               <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-xl text-center min-w-[130px]">
                 <div className="font-mono text-xl font-bold text-red-600 dark:text-red-500 mb-1">&minus;50</div>
                 <div className="text-xs text-neutral-500">Weak senders pull it down</div>
               </div>
               <div className="text-xl font-bold text-neutral-400 rotate-90 sm:rotate-0">+</div>
               <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-xl text-center min-w-[130px]">
                 <div className="font-mono text-xl font-bold text-red-600 dark:text-red-500 mb-1">&minus;5</div>
                 <div className="text-xs text-neutral-500">Low scarcity (many sends)</div>
               </div>
               <div className="text-xl font-bold text-neutral-400 rotate-90 sm:rotate-0">=</div>
               <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 p-4 rounded-xl text-center min-w-[130px]">
                 <div className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400 mb-1">~1,545</div>
                 <div className="text-xs text-neutral-500">Effective rating</div>
               </div>
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mt-12 mb-3">How a "hard" V6 gains points</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-base">If a V6 is only being sent by V7+ climbers, and very few people have sent it, the system recognizes it's probably harder than average. The climb's rating rises.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 my-8">
               <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-xl text-center min-w-[130px]">
                 <div className="font-mono text-xl font-bold mb-1">1,600</div>
                 <div className="text-xs text-neutral-500">V6 base</div>
               </div>
               <div className="text-xl font-bold text-neutral-400 rotate-90 sm:rotate-0">+</div>
               <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 rounded-xl text-center min-w-[130px]">
                 <div className="font-mono text-xl font-bold text-green-600 dark:text-green-500 mb-1">+50</div>
                 <div className="text-xs text-neutral-500">Strong senders push it up</div>
               </div>
               <div className="text-xl font-bold text-neutral-400 rotate-90 sm:rotate-0">+</div>
               <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 rounded-xl text-center min-w-[130px]">
                 <div className="font-mono text-xl font-bold text-green-600 dark:text-green-500 mb-1">+33</div>
                 <div className="text-xs text-neutral-500">High scarcity (few sends)</div>
               </div>
               <div className="text-xl font-bold text-neutral-400 rotate-90 sm:rotate-0">=</div>
               <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 p-4 rounded-xl text-center min-w-[130px]">
                 <div className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400 mb-1">~1,683</div>
                 <div className="text-xs text-neutral-500">Effective rating</div>
               </div>
            </div>

            <p className="text-neutral-600 dark:text-neutral-400 mb-6">So if you send that "hard" V6 instead of the "popular" V6, you'll earn <strong>~138 more points</strong> &mdash; roughly the same as the difference between an entire V-grade.</p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 sm:p-5 rounded-r-xl text-sm text-neutral-700 dark:text-neutral-300">
              <strong className="text-neutral-900 dark:text-white">The elasticity knob:</strong> We use a 50/50 blend between the posted grade and what the community says. This means the setter's grade still matters &mdash; a V6 can't suddenly become a V10 &mdash; but it can float up or down within a reasonable range.
            </div>
          </section>

          {/* SECTION: Putting It All Together */}
          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-neutral-900 dark:text-white mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-xl shrink-0">&#x1F9E9;</span>
              Putting It All Together
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">Let's walk through a full example with three climbers to see how everything combines.</p>

            <div className="overflow-x-auto mb-6 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                 <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                       <th className="px-4 py-3 font-semibold text-neutral-500 uppercase tracking-wider text-xs border-b border-neutral-200 dark:border-neutral-800">Climber</th>
                       <th className="px-4 py-3 font-semibold text-neutral-500 uppercase tracking-wider text-xs border-b border-neutral-200 dark:border-neutral-800">Sends (last 30 days)</th>
                       <th className="px-4 py-3 font-semibold text-neutral-500 uppercase tracking-wider text-xs border-b border-neutral-200 dark:border-neutral-800">Hardest</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-600 dark:text-neutral-300">
                    <tr>
                       <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">The Crusher</td>
                       <td className="px-4 py-3">1 hard V8, 2 V5s</td>
                       <td className="px-4 py-3 font-mono">V8</td>
                    </tr>
                    <tr>
                       <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">The All-Rounder</td>
                       <td className="px-4 py-3">1 hard V6, 3 V5s, 5 V4s</td>
                       <td className="px-4 py-3 font-mono">V6</td>
                    </tr>
                    <tr>
                       <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">The Volume Machine</td>
                       <td className="px-4 py-3">40 V4s, 1 popular V6</td>
                       <td className="px-4 py-3 font-mono">V6</td>
                    </tr>
                 </tbody>
              </table>
            </div>

            <ol className="list-disc pl-5 space-y-2 text-neutral-600 dark:text-neutral-400 mb-8">
               <li><strong>Step 1:</strong> Start with base grades (V4 = 1400, V5 = 1500, V6 = 1600, V8 = 1800).</li>
               <li><strong>Step 2:</strong> Adjust climb ratings based on senders. The "hard" V8 stays near 1800+. The "popular" V6 drops because weaker climbers also sent it. The "hard" V6 stays high.</li>
               <li><strong>Step 3:</strong> Calculate each climber's score using the weighted sum:</li>
            </ol>

            <div className="space-y-4 max-w-xl mx-auto mb-8">
               {[
                 { label: 'The Crusher', desc: '1 hard V8 + 2 V5s', color: 'bg-green-500', w: '92%', val: '~1,850' },
                 { label: 'The All-Rounder', desc: '1 hard V6 + pyramid', color: 'bg-blue-500', w: '83%', val: '~1,665' },
                 { label: 'The Volume Machine', desc: '40 V4s + 1 soft V6', color: 'bg-amber-500', w: '79%', val: '~1,590' },
               ].map(b => (
                 <div key={b.label} className="flex items-center gap-3">
                    <div className="w-32 text-right">
                       <div className="font-bold text-sm text-neutral-900 dark:text-white">{b.label}</div>
                       <div className="text-[10px] text-neutral-500">{b.desc}</div>
                    </div>
                    <div className="flex-1 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-md relative overflow-hidden">
                       <div className={cn("h-full rounded-md", b.color)} style={{ width: b.w }} />
                    </div>
                    <div className="w-16 text-left font-mono font-bold text-sm text-neutral-900 dark:text-white">{b.val}</div>
                 </div>
               ))}
            </div>

            <p className="text-neutral-600 dark:text-neutral-400">Notice how The All-Rounder beats The Volume Machine even though The Volume Machine logged way more climbs. The All-Rounder's "hard" V6 is worth more than the "popular" V6 that everyone sends.</p>
          </section>

          {/* SECTION: Movement & Timeline */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white mb-3">
                     <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-lg shrink-0">&#x1F4C5;</span>
                     The 30-Day Window
                   </h2>
                   <p className="text-sm text-neutral-600 dark:text-neutral-400">Only sends from the <strong>last 30 days</strong> count toward your live score. Climbed a V10 two months ago? Great, but it won't show up on the rolling leaderboard. This keeps the ranking fresh and rewards current form.</p>
                </div>
                <div>
                   <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white mb-3">
                     <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 text-lg shrink-0">&#x1F504;</span>
                     The Algorithm
                   </h2>
                   <p className="text-sm text-neutral-600 dark:text-neutral-400">We solve the chicken-and-egg problem by <strong>iterating 5 times</strong>. Start with a rough guess (everyone's rating = their max grade), then alternate between updating climb ratings and climber ratings. By the final pass, scores converge.</p>
                </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
