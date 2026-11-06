import requests
import json
import os
import math
import time
import random
import logging
import sys
from datetime import datetime, timedelta, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
# Force unbuffered output so GitHub Actions shows logs in real-time
sys.stdout.reconfigure(line_buffering=True)

log = logging.getLogger("update")

# --- CONFIGURATION ---
GYM_ID = os.environ.get('GYM_ID', '51')
GYM_NAME = os.environ.get('GYM_NAME', 'Dogpatch Boulders')

CONSTANTS = {
    'BASE_POINTS_V0': 1000,
    'POINTS_PER_GRADE': 100,
    'DECAY_FACTOR': 0.8,      
    'ELASTICITY': 0.5,        
    'SCARCITY_WEIGHT': 50,    
    'ITERATIONS': 5,          
    'DAYS_WINDOW': 30         
}

DATA_FILE = 'data/raw_ascents.json'
RAW_RETENTION_DAYS = 60
LEADERBOARD_FILE = 'data/leaderboard.json'
HISTORY_FILE = 'data/history.json'
TIME_WINDOWS = [7, 14, 30]

# --- NETWORK CONFIGURATION (EXACT FROM YOUR SCRIPT) ---
headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': '',
    'content-type': 'application/json',
    'origin': 'https://kaya-app.kayaclimb.com',
    'priority': 'u=1, i',
    'referer': 'https://kaya-app.kayaclimb.com/',
    'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
}

# The Massive Query String
GRAPHQL_QUERY = 'query webAscentsForGym($gym_id: ID!, $count: Int!, $offset: Int!) {\n  webAscentsForGym(gym_id: $gym_id, count: $count, offset: $offset) {\n    ...WebAscentFields\n    __typename\n  }\n}\n\nfragment WebAscentFields on WebAscent {\n  id\n  user {\n    ...WebUserFields\n    __typename\n  }\n  climb {\n    ...WebClimbBasicFields\n    __typename\n  }\n  date\n  comment\n  rating\n  stiffness\n  grade {\n    ...GradeFields\n    __typename\n  }\n  photo {\n    photo_url\n    thumb_url\n    __typename\n  }\n  video {\n    video_url\n    thumb_url\n    __typename\n  }\n  __typename\n}\n\nfragment WebUserFields on WebUser {\n  id\n  username\n  fname\n  lname\n  photo_url\n  is_private\n  bio\n  height\n  ape_index\n  limit_grade_bouldering {\n    name\n    id\n    __typename\n  }\n  limit_grade_routes {\n    name\n    id\n    __typename\n  }\n  is_premium\n  __typename\n}\n\nfragment WebClimbBasicFields on WebClimb {\n  slug\n  name\n  rating\n  ascent_count\n  grade {\n    name\n    id\n    __typename\n  }\n  climb_type {\n    name\n    __typename\n  }\n  color {\n    name\n    __typename\n  }\n  gym {\n    name\n    __typename\n  }\n  board {\n    name\n    __typename\n  }\n  destination {\n    name\n    __typename\n  }\n  area {\n    name\n    __typename\n  }\n  is_gb_moderated\n  is_access_sensitive\n  is_closed\n  is_offensive\n  __typename\n}\n\nfragment GradeFields on Grade {\n  id\n  name\n  climb_type_id\n  grade_type_id\n  ordering\n  mapped_grade_ids\n  climb_type_group\n  __typename\n}\n'

# --- HELPER FUNCTIONS ---

def parse_grade_to_points(grade_str):
    if not grade_str: return CONSTANTS['BASE_POINTS_V0']
    g = grade_str.lower().replace('v', '').strip()
    try:
        if '-' in g: g = g.split('-')[1]
        grade_num = int(float(g))
    except ValueError:
        grade_num = 0
    return CONSTANTS['BASE_POINTS_V0'] + (grade_num * CONSTANTS['POINTS_PER_GRADE'])

def calculate_scarcity_bonus(ascent_count):
    if ascent_count <= 0: return 0
    return CONSTANTS['SCARCITY_WEIGHT'] * (1 / math.log(ascent_count + 1.1))

# --- CORE CLASSES ---

class KayaRanker:
    def __init__(self, data, days_window=None):
        self.raw_data = data
        self.days_window = days_window or CONSTANTS['DAYS_WINDOW']
        self.users = {}
        self.climbs = {}
        
    def run(self):
        self._preprocess_data()
        self._initialize_ratings()
        self._iterative_solve()
        return self._generate_leaderboard(), self._generate_climb_rankings(), self.get_climb_of_the_week()

    def _preprocess_data(self):
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.days_window)
        log.info("Filtering ranking window since: %s", cutoff_date.date())
        
        for entry in self.raw_data:
            try:
                d_str = entry['date'].replace('Z', '+00:00')
                ascent_date = datetime.fromisoformat(d_str)
                if ascent_date < cutoff_date: continue
            except ValueError: continue

            u_data = entry['user']
            c_data = entry['climb']
            grade_str = c_data.get('grade', {}).get('name', 'v0')
            base_points = parse_grade_to_points(grade_str)
            uid = u_data['id']
            cid = c_data['slug']
            
            if uid not in self.users:
                self.users[uid] = {
                    'name': f"{u_data['fname']} {u_data['lname']}",
                    'username': u_data['username'],
                    'sends': [],
                    'rating': 0,
                    'max_base_grade': 0
                }
            
            if base_points > self.users[uid]['max_base_grade']:
                self.users[uid]['max_base_grade'] = base_points
                
            self.users[uid]['sends'].append(cid)

            color_name = (c_data.get('color') or {}).get('name', '')
            if color_name:
                display_name = f"{color_name} {grade_str.upper()}".strip()
            else:
                display_name = c_data.get('name') or c_data.get('slug')

            if cid not in self.climbs:
                self.climbs[cid] = {
                    'name': display_name,
                    'grade_name': grade_str,
                    'base_rating': base_points,
                    'current_rating': base_points,
                    'senders': set(),
                    'first_ascent_date': ascent_date,
                }
            else:
                if ascent_date < self.climbs[cid]['first_ascent_date']:
                    self.climbs[cid]['first_ascent_date'] = ascent_date
            self.climbs[cid]['senders'].add(uid)

        log.info("Preprocessed: %d users, %d climbs from %d raw entries",
                 len(self.users), len(self.climbs), len(self.raw_data))

    def _initialize_ratings(self):
        for uid, user in self.users.items():
            user['rating'] = user['max_base_grade']

    def _iterative_solve(self):
        VOLUME_FACTOR = 0.1 
        for _ in range(CONSTANTS['ITERATIONS']):
            for cid, climb in self.climbs.items():
                sender_ids = climb['senders']
                if not sender_ids: continue
                avg_user_rating = sum(self.users[uid]['rating'] for uid in sender_ids) / len(sender_ids)
                scarcity = calculate_scarcity_bonus(len(sender_ids))
                diff = avg_user_rating - climb['base_rating']
                climb['current_rating'] = climb['base_rating'] + (CONSTANTS['ELASTICITY'] * diff) + scarcity

            for uid, user in self.users.items():
                user_sends_scores = [self.climbs[cid]['current_rating'] for cid in user['sends']]
                user_sends_scores.sort(reverse=True)
                new_score = 0
                for idx, score in enumerate(user_sends_scores):
                    if idx > 10: break 
                    weight = VOLUME_FACTOR ** idx
                    new_score += score * weight
                user['rating'] = new_score

    def _generate_leaderboard(self):
        leaderboard = []
        for uid, user in self.users.items():
            send_details = []
            grade_counts = {}
            for cid in user['sends']:
                climb = self.climbs[cid]
                gname = climb['grade_name']
                send_details.append({
                    'slug': cid,
                    'name': climb['name'],
                    'grade': gname,
                    'rating': int(climb['current_rating']),
                })
                g_key = gname.upper() if gname else 'V?'
                grade_counts[g_key] = grade_counts.get(g_key, 0) + 1

            send_details.sort(key=lambda x: x['rating'], reverse=True)

            leaderboard.append({
                'user_id': uid,
                'username': user['username'],
                'name': user['name'],
                'score': int(user['rating']),
                'top_send': max([self.climbs[cid]['grade_name'] for cid in user['sends']], key=lambda x: parse_grade_to_points(x)),
                'total_sends': len(user['sends']),
                'sends': send_details[:10],
                'grade_pyramid': grade_counts,
            })
        leaderboard.sort(key=lambda x: x['score'], reverse=True)
        for i, row in enumerate(leaderboard):
            row['rank'] = i + 1
        return leaderboard

    def _generate_climb_rankings(self):
        climb_list = []
        for cid, climb in self.climbs.items():
            climb_list.append({
                'slug': cid,
                'name': climb['name'],
                'grade': climb['grade_name'],
                'base_rating': int(climb['base_rating']),
                'adjusted_rating': int(climb['current_rating']),
                'num_senders': len(climb['senders']),
            })
        climb_list.sort(key=lambda x: x['adjusted_rating'], reverse=True)
        for i, row in enumerate(climb_list):
            row['rank'] = i + 1
        return climb_list

    def get_climb_of_the_week(self):
        """Highest-rated climb whose first ascent was in the last 7 days."""
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        candidates = []
        for cid, climb in self.climbs.items():
            if climb.get('first_ascent_date') and climb['first_ascent_date'] >= week_ago:
                candidates.append({
                    'slug': cid,
                    'name': climb['name'],
                    'grade': climb['grade_name'],
                    'adjusted_rating': int(climb['current_rating']),
                    'num_senders': len(climb['senders']),
                })
        if not candidates:
            return None
        candidates.sort(key=lambda x: x['adjusted_rating'], reverse=True)
        return candidates[0]

# --- SCRAPING LOGIC ---
#
# Kaya's list endpoints reject count > 50 ("Count Limit Exceeded") and
# offset > 150 ("Offset Limit Exceeded"), so any list only exposes its newest
# 200 items. For the gym feed that is ~1.5-2 days of ascents: if the stored data
# is older than that (missed/failed runs, busy weekend), the gap cannot be read
# from the gym feed and is backfilled from per-climber feeds instead.

API_URL = 'https://kaya-beta.kayaclimb.com/graphql'
PAGE_SIZE = 50
MAX_OFFSET = 150
LIMIT_ERRORS = ('Offset Limit Exceeded', 'Count Limit Exceeded')
MIN_REQUEST_INTERVAL = 1.0      # seconds; bursts above ~1 req/s get "Error. Try again later."
MAX_BACKFILL_FAILURE_RATE = 0.02

_FRAGMENTS = GRAPHQL_QUERY[GRAPHQL_QUERY.index('fragment '):]

# Same ascent shape as GRAPHQL_QUERY, plus the climb's gym id (aliased, stripped
# before storing) so ascents at other gyms can be filtered out.
USER_ASCENTS_QUERY = (
    'query webAscentsForUser($user_id: ID!, $count: Int!, $offset: Int!) {\n'
    '  webAscentsForUser(user_id: $user_id, count: $count, offset: $offset) {\n'
    '    ...WebAscentFields\n'
    '    gym_check: climb {\n      gym {\n        id\n      }\n    }\n'
    '    __typename\n'
    '  }\n'
    '}\n\n' + _FRAGMENTS
)
# Only used to discover climbers who are not in the stored data yet.
# webClimbsForGym returns the gym's 200 most-ascended climbs.
CLIMBS_QUERY = (
    'query webClimbsForGym($gym_id: ID!, $count: Int!, $offset: Int!) {\n'
    '  webClimbsForGym(gym_id: $gym_id, count: $count, offset: $offset) { id }\n'
    '}\n'
)
CLIMB_CLIMBERS_QUERY = (
    'query webAscentsForClimb($climb_id: ID!, $count: Int!, $offset: Int!) {\n'
    '  webAscentsForClimb(climb_id: $climb_id, count: $count, offset: $offset) { date user { id } }\n'
    '}\n'
)


class KayaLimitError(Exception):
    """Server-side pagination cap hit — retrying will never help."""


class KayaFetchError(Exception):
    """Request still failing after all retries (or failing in a non-retryable way)."""


_last_request_at = 0.0


def graphql(operation, query, variables, max_retries=6):
    """POST one GraphQL operation, with throttling and capped exponential backoff."""
    global _last_request_at
    payload = {'operationName': operation, 'variables': variables, 'query': query}

    for attempt in range(max_retries):
        wait = _last_request_at + MIN_REQUEST_INTERVAL - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _last_request_at = time.monotonic()
        try:
            response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
            log.debug("POST %s %s -> HTTP %d (%.0fms)", operation, variables, response.status_code,
                      response.elapsed.total_seconds() * 1000)
            if 400 <= response.status_code < 500 and response.status_code != 429:
                raise KayaFetchError(f"{operation}: HTTP {response.status_code}: {response.text[:300]}")
            response.raise_for_status()

            res_json = response.json()
            errors = res_json.get('errors')
            if errors:
                messages = [e.get('message', '') for e in errors]
                if any(m in LIMIT_ERRORS for m in messages):
                    raise KayaLimitError('; '.join(messages))
                raise ValueError(f"GraphQL Error: {errors}")
            if res_json.get('data') is None:
                raise ValueError("GraphQL response has no data")
            return res_json['data']

        except (KayaLimitError, KayaFetchError):
            raise
        except Exception as e:
            if attempt == max_retries - 1:
                raise KayaFetchError(f"{operation} {variables} failed after {max_retries} attempts: {e}") from e
            sleep_time = min(2 ** (attempt + 1), 30) + random.uniform(0, 1)
            log.warning("Error on %s %s (attempt %d/%d): %s — retrying in %.2fs",
                        operation, variables, attempt + 1, max_retries, e, sleep_time)
            time.sleep(sleep_time)


def fetch_pages(operation, query, variables, since=None, max_retries=6):
    """
    Page through a newest-first Kaya list until a page reaches `since`, the list
    ends, or the server's pagination cap is hit.
    Returns (items, truncated): truncated=True means the cap was hit before
    reaching `since`/the end, i.e. older items exist that we could not read.
    """
    items = []
    for offset in range(0, MAX_OFFSET + 1, PAGE_SIZE):
        try:
            data = graphql(operation, query, {**variables, 'count': PAGE_SIZE, 'offset': offset}, max_retries)
        except KayaLimitError as e:
            log.warning("%s hit the server pagination cap at offset %d: %s", operation, offset, e)
            return items, True
        batch = data[operation] or []
        items.extend(batch)
        if len(batch) < PAGE_SIZE:
            return items, False
        if since and min(x['date'] for x in batch) <= since:
            return items, False
    return items, True


def fetch_incremental_data(latest_stored_date):
    """
    Reads the gym feed back to data we already have.
    Returns (new_items, gap): gap=True if the feed's cap was hit before reaching
    stored data, so ascents between `latest_stored_date` and the oldest reachable
    one are missing and need backfill_gap().
    """
    fetch_start = time.monotonic()
    log.info("Starting incremental fetch — looking for data newer than: %s", latest_stored_date)

    items, gap = fetch_pages('webAscentsForGym', GRAPHQL_QUERY, {'gym_id': GYM_ID}, since=latest_stored_date)
    new_data = [x for x in items if not latest_stored_date or x['date'] > latest_stored_date]

    if gap:
        log.warning("Gym feed cap reached after %d ascents (oldest reachable: %s) without reaching stored data",
                    len(items), items[-1]['date'] if items else None)
    else:
        log.info("Reached existing data / end of feed after %d ascents", len(items))
    log.info("Fetch complete: %d new items in %.1fs", len(new_data), time.monotonic() - fetch_start)
    return new_data, gap


def discover_climber_ids(since):
    """Best effort: ids of climbers with ascents since `since` on the gym's popular climbs."""
    climbs, _ = fetch_pages('webClimbsForGym', CLIMBS_QUERY, {'gym_id': GYM_ID})
    climber_ids = set()
    failed = 0
    for climb in climbs:
        try:
            ascents, _ = fetch_pages('webAscentsForClimb', CLIMB_CLIMBERS_QUERY,
                                     {'climb_id': climb['id']}, since=since, max_retries=4)
        except KayaFetchError as e:
            failed += 1
            log.debug("Skipping climb %s during discovery: %s", climb['id'], e)
            continue
        climber_ids.update(a['user']['id'] for a in ascents if a.get('user') and a['date'] > since)
    log.info("Discovery: %d climbers active since %s on %d climbs (%d climbs failed, skipped)",
             len(climber_ids), since, len(climbs), failed)
    return climber_ids


def backfill_gap(since, known_climber_ids):
    """Recover this gym's ascents newer than `since` from per-climber feeds."""
    start = time.monotonic()
    log.warning("Backfilling ascents since %s from per-climber feeds", since)

    climber_ids = sorted(set(known_climber_ids) | discover_climber_ids(since))
    found = {}
    failed = []
    truncated = 0
    for i, uid in enumerate(climber_ids, 1):
        try:
            ascents, capped = fetch_pages('webAscentsForUser', USER_ASCENTS_QUERY, {'user_id': uid}, since=since)
        except KayaFetchError as e:
            failed.append(uid)
            log.warning("Backfill failed for climber %s: %s", uid, e)
            continue
        truncated += capped
        for a in ascents:
            gym = (a.pop('gym_check', None) or {}).get('gym') or {}
            if str(gym.get('id')) == str(GYM_ID) and a['date'] > since:
                found[a['id']] = a
        if i % 50 == 0:
            log.info("Backfill progress: %d/%d climbers, %d ascents so far", i, len(climber_ids), len(found))

    if climber_ids and len(failed) / len(climber_ids) > MAX_BACKFILL_FAILURE_RATE:
        raise KayaFetchError(f"Backfill failed for {len(failed)}/{len(climber_ids)} climbers — "
                             "aborting without saving so the next run retries the whole gap")
    log.info("Backfill complete: %d ascents from %d climbers in %.1fs "
             "(%d climbers failed, %d had >%d ascents since %s and were truncated)",
             len(found), len(climber_ids), time.monotonic() - start,
             len(failed), truncated, MAX_OFFSET + PAGE_SIZE, since)
    return list(found.values())

# --- MAIN EXECUTION ---

def main():
    run_start = time.monotonic()
    log.info("=== Leaderboard update started for %s (gym_id=%s) ===", GYM_NAME, GYM_ID)

    # 1. Load Existing Raw Data
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                all_ascents = json.load(f)
            log.info("Loaded %d existing ascents from %s", len(all_ascents), DATA_FILE)
        except json.JSONDecodeError:
            log.warning("Failed to parse %s — starting fresh", DATA_FILE)
            all_ascents = []
    else:
        log.info("No existing data file at %s — starting fresh", DATA_FILE)
        all_ascents = []

    # 2. Determine Latest Date in current file
    latest_date = None
    if all_ascents:
        all_ascents.sort(key=lambda x: x['date'], reverse=True)
        latest_date = all_ascents[0]['date']
    log.info("Latest stored date: %s", latest_date or "(none)")

    # 3. Fetch Updates (Incremental)
    new_ascents, gap = fetch_incremental_data(latest_date)
    log.info("Fetched %d new ascents", len(new_ascents))

    # 3b. Backfill if the gym feed could not reach back to the stored data
    if gap:
        retention_cutoff = (datetime.now(timezone.utc) - timedelta(days=RAW_RETENTION_DAYS)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        since = max(latest_date or retention_cutoff, retention_cutoff)
        known_climbers = {a['user']['id'] for a in all_ascents + new_ascents if a.get('user')}
        new_ascents += backfill_gap(since, known_climbers)
    
    # 4. Merge and Deduplicate
    before_merge = len(all_ascents)
    ascent_map = {x['id']: x for x in all_ascents}
    for x in new_ascents:
        ascent_map[x['id']] = x
    
    final_data = list(ascent_map.values())
    log.info("Merged: %d existing + %d new = %d unique ascents", before_merge, len(new_ascents), len(final_data))
    
    # 5. Clean up old data (keep last 60 days to reduce file size)
    cleanup_date = (datetime.now(timezone.utc) - timedelta(days=RAW_RETENTION_DAYS)).isoformat()
    pre_cleanup = len(final_data)
    final_data = [x for x in final_data if x['date'].replace('Z', '+00:00') > cleanup_date]
    log.info("Cleanup: removed %d ascents older than 60 days, %d remaining", pre_cleanup - len(final_data), len(final_data))

    # Save Updated Raw Data
    os.makedirs('data', exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(final_data, f)
    log.info("Saved raw data to %s", DATA_FILE)

    # 6. Calculate Current Leaderboard
    log.info("Running ranking algorithm...")
    ranker = KayaRanker(final_data)
    current_leaderboard, climb_rankings, climb_of_week = ranker.run()
    log.info("Ranking complete: %d users on leaderboard, %d climbs ranked", len(current_leaderboard), len(climb_rankings))
    if climb_of_week:
        log.info("Climb of the week: %s (%s, rating %d)", climb_of_week['name'], climb_of_week['grade'], climb_of_week['adjusted_rating'])

    # 7. Compare with Yesterday's Leaderboard (for arrows)
    old_ranks = {}
    if os.path.exists(LEADERBOARD_FILE):
        try:
            with open(LEADERBOARD_FILE, 'r') as f:
                old_data = json.load(f)
            entries = old_data.get('leaderboard', old_data) if isinstance(old_data, dict) else old_data
            old_ranks = {x['username']: x['rank'] for x in entries}
            log.info("Loaded previous leaderboard with %d entries for movement comparison", len(old_ranks))
        except Exception as e:
            log.warning("Could not load previous leaderboard: %s", e)
    else:
        log.info("No previous leaderboard file — all entries will be marked NEW")

    new_count = 0
    for row in current_leaderboard:
        username = row['username']
        if username in old_ranks:
            prev = old_ranks[username]
            curr = row['rank']
            row['movement'] = prev - curr 
        else:
            row['movement'] = 'NEW'
            new_count += 1
    log.info("Movement: %d new entries, %d returning", new_count, len(current_leaderboard) - new_count)

    # 8. Save Leaderboard with Metadata
    metadata = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "gym_id": GYM_ID,
        "gym_name": GYM_NAME,
    }
    if climb_of_week:
        metadata["climb_of_the_week"] = climb_of_week
    output_data = {
        "metadata": metadata,
        "leaderboard": current_leaderboard
    }

    with open(LEADERBOARD_FILE, 'w') as f:
        json.dump(output_data, f)
    log.info("Saved leaderboard to %s", LEADERBOARD_FILE)

    # 8b. Append to score history (keeps last 60 days of daily snapshots)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    history = {}
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                history = json.load(f)
        except Exception:
            history = {}

    today_snapshot = {row['username']: row['score'] for row in current_leaderboard}
    history[today_str] = today_snapshot

    cutoff_history = (datetime.now(timezone.utc) - timedelta(days=60)).strftime("%Y-%m-%d")
    history = {k: v for k, v in history.items() if k >= cutoff_history}

    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f)
    log.info("Saved score history to %s (%d days)", HISTORY_FILE, len(history))

    # 9. Save Climb Rankings
    CLIMBS_FILE = 'data/climbs.json'
    climbs_output = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        },
        "climbs": climb_rankings
    }
    with open(CLIMBS_FILE, 'w') as f:
        json.dump(climbs_output, f)
    log.info("Saved climb rankings to %s (%d climbs)", CLIMBS_FILE, len(climb_rankings))

    # 10. Generate time-window variants (7d, 14d)
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for window in TIME_WINDOWS:
        if window == CONSTANTS['DAYS_WINDOW']:
            continue
        log.info("Generating %d-day leaderboard...", window)
        tw_ranker = KayaRanker(final_data, days_window=window)
        tw_leaderboard, _, _ = tw_ranker.run()
        tw_leaderboard.sort(key=lambda x: x['score'], reverse=True)
        for i, row in enumerate(tw_leaderboard):
            row['rank'] = i + 1
            row['movement'] = 0
        tw_output = {"metadata": {"generated_at": generated_at}, "leaderboard": tw_leaderboard}
        tw_file = f'data/leaderboard-{window}d.json'
        with open(tw_file, 'w') as f:
            json.dump(tw_output, f)
        log.info("Saved %d-day leaderboard to %s (%d users)", window, tw_file, len(tw_leaderboard))

    elapsed = time.monotonic() - run_start
    if current_leaderboard:
        log.info("Top 3: %s",
                 ", ".join(f"#{r['rank']} {r['name']} ({r['score']}pts)" for r in current_leaderboard[:3]))
    log.info("=== Leaderboard update finished in %.1fs ===", elapsed)

if __name__ == "__main__":
    main()