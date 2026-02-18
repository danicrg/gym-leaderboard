# Dogpatch Boulders Leaderboard

A community-driven climbing leaderboard for [Dogpatch Boulders](https://kaya-app.kayaclimb.com) that ranks climbers based on their hardest sends over the last 30 days. Climb data is pulled from the [Kaya](https://kaya-app.kayaclimb.com) app and scored with an iterative algorithm that adjusts grades based on who actually sends them.

## How It Works

1. **Scrape** ascent data from Kaya's GraphQL API (incremental — only fetches new entries)
2. **Rank** climbers using an iterative solver that refines climb difficulty and climber scores together
3. **Publish** a static leaderboard as a GitHub Pages site, updated daily via GitHub Actions

The scoring system is designed around one principle: **peak ability matters more than volume.** Your score is dominated by your single hardest send — additional climbs act as tiebreakers, not replacements for difficulty. See the full [methodology page](methodology.html) for details.

## Project Structure

```
├── index.html          # Leaderboard frontend
├── methodology.html    # Scoring methodology explainer
├── update.py           # Daily update script (scrape + rank + save)
├── data/
│   ├── raw_ascents.json    # Cached ascent data (last 60 days)
│   └── leaderboard.json    # Current leaderboard output
└── .github/workflows/
    └── daily.yml       # Scheduled GitHub Actions workflow
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
pip install requests tqdm pandas numpy
```

### Run locally

```bash
python kaya.py
```

### Run the daily updater

```bash
python update.py
```

This incrementally fetches new ascents, merges them with cached data, runs the ranking algorithm, computes rank movement, and writes `data/leaderboard.json`.

## Automation

The leaderboard updates daily at 08:00 UTC via a [GitHub Actions workflow](.github/workflows/daily.yml). The workflow runs `update.py` and auto-commits the updated JSON files back to the repo.

## License

MIT
