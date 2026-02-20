# Dogpatch Boulders Leaderboard

A community-driven climbing leaderboard for [Dogpatch Boulders](https://kaya-app.kayaclimb.com) that ranks climbers based on their hardest sends over the last 30 days. Climb data is pulled from the [Kaya](https://kaya-app.kayaclimb.com) app and scored with an iterative algorithm that adjusts grades based on who actually sends them.

## How It Works

1. **Scrape** ascent data from Kaya's GraphQL API (incremental — only fetches new entries)
2. **Rank** climbers using an iterative solver that refines climb difficulty and climber scores together
3. **Publish** a static leaderboard as a GitHub Pages site, updated daily via GitHub Actions

The scoring system is designed around one principle: **peak ability matters more than volume.** Your score is dominated by your single hardest send — additional climbs act as tiebreakers, not replacements for difficulty. See the full [methodology page](methodology.html) for details.

## Features

- **Search & Filter** — Find climbers by name/username, filter by minimum grade
- **Podium** — Gold/silver/bronze cards for the top 3 climbers
- **Biggest Movers** — Daily risers and fallers highlighted
- **Expandable Rows** — Click any climber to see their top sends and grade pyramid
- **Time Window Toggle** — Switch between 7-day, 14-day, and 30-day views
- **Score Sparklines** — Inline trend charts showing score history over time
- **Dark Mode** — Toggle with auto-detection for system preference
- **[Hardest Climbs](climbs.html)** — Climb rankings by adjusted difficulty
- **[Head-to-Head](compare.html)** — Side-by-side comparison of any two climbers
- **[Profile Cards](profile.html)** — Shareable stats card for any climber
- **Climb of the Week** — Highlights the highest-rated newly-sent climb
- **Multi-Gym Support** — Configure `GYM_ID` to run for any Kaya gym

## Project Structure

```
├── index.html              # Leaderboard frontend
├── climbs.html             # Hardest climbs page
├── compare.html            # Head-to-head comparison
├── profile.html            # Personal stats card
├── methodology.html        # Scoring methodology explainer
├── update.py               # Daily update script (scrape + rank + save)
├── data/
│   ├── raw_ascents.json    # Cached ascent data (last 60 days)
│   ├── leaderboard.json    # Current 30-day leaderboard
│   ├── leaderboard-7d.json # 7-day leaderboard
│   ├── leaderboard-14d.json# 14-day leaderboard
│   ├── climbs.json         # Climb rankings by adjusted difficulty
│   └── history.json        # Daily score snapshots (last 60 days)
└── .github/workflows/
    └── daily.yml           # Scheduled GitHub Actions workflow
```

## Scoring at a Glance

| Concept | Detail |
|---|---|
| **Base score** | `1000 + (V-grade × 100)` — V0 = 1000, V6 = 1600, V10 = 2000 |
| **Grade adjustment** | Climb ratings shift based on the strength of their senders (50% elasticity) |
| **Scarcity bonus** | Rarely-sent climbs earn a logarithmic bonus (up to ~33 pts) |
| **Volume decay** | Each subsequent send is worth 10× less — your 2nd climb counts 10%, 3rd counts 1% |
| **Time window** | Rolling 30 days — only recent sends count |

## Setup

```bash
pip install requests
```

### Run locally

```bash
python update.py
```

This incrementally fetches new ascents, merges them with cached data, runs the ranking algorithm, computes rank movement, and writes all output JSON files.

### Multi-Gym Configuration

Set environment variables to target a different Kaya gym:

```bash
GYM_ID=42 GYM_NAME="My Gym" python update.py
```

For GitHub Actions, set `GYM_ID` and `GYM_NAME` as repository variables.

## Automation

The leaderboard updates daily at midnight PST (08:00 UTC) via a [GitHub Actions workflow](.github/workflows/daily.yml). The workflow runs `update.py` and auto-commits the updated JSON files back to the repo.

## License

MIT
