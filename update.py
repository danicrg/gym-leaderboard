import requests
import json
import os
import math
import time
import random
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# 1. Load Environment Variables
load_dotenv()

# --- CONFIGURATION ---
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
LEADERBOARD_FILE = 'data/leaderboard.json'

# Get token securely
AUTH_TOKEN = os.environ.get("KAYA_TOKEN")
if not AUTH_TOKEN:
    raise ValueError("No KAYA_TOKEN found! Check your .env file or GitHub Secrets.")

# --- NETWORK CONFIGURATION (EXACT FROM YOUR SCRIPT) ---
headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': f'Bearer {AUTH_TOKEN}', # Injected securely
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
    def __init__(self, data):
        self.raw_data = data
        self.users = {}
        self.climbs = {}
        
    def run(self):
        self._preprocess_data()
        self._initialize_ratings()
        self._iterative_solve()
        return self._generate_leaderboard()

    def _preprocess_data(self):
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=CONSTANTS['DAYS_WINDOW'])
        print(f"Filtering ranking window since: {cutoff_date.date()}")
        
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

            if cid not in self.climbs:
                self.climbs[cid] = {
                    'name': c_data.get('name') or c_data.get('slug'),
                    'grade_name': grade_str,
                    'base_rating': base_points,
                    'current_rating': base_points,
                    'senders': set()
                }
            self.climbs[cid]['senders'].add(uid)

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
            leaderboard.append({
                'username': user['username'],
                'name': user['name'],
                'score': int(user['rating']),
                'top_send': max([self.climbs[cid]['grade_name'] for cid in user['sends']], key=lambda x: parse_grade_to_points(x)),
                'total_sends': len(user['sends'])
            })
        leaderboard.sort(key=lambda x: x['score'], reverse=True)
        for i, row in enumerate(leaderboard):
            row['rank'] = i + 1
        return leaderboard

# --- SCRAPING LOGIC (EXACT REPLICA) ---

def get_data_batch(offset, max_retries=20):
    """Exact logic from original script for a single batch."""
    json_data = {
        'operationName': 'webAscentsForGym',
        'variables': {
            'gym_id': '51',
            'offset': offset,
            'count': 15,
        },
        'query': GRAPHQL_QUERY,
    }

    # Retry Loop
    for attempt in range(max_retries):
        try:
            response = requests.post('https://kaya-beta.kayaclimb.com/graphql', headers=headers, json=json_data)
            
            # 1. Check valid HTTP Status
            response.raise_for_status() 
            
            # 2. Parse JSON
            res_json = response.json()

            # 3. Check for GraphQL specific errors
            if 'errors' in res_json or res_json.get('data') is None:
                raise ValueError(f"GraphQL Error: {res_json.get('errors')}")

            return res_json['data']['webAscentsForGym']

        except Exception as e:
            if attempt == max_retries - 1:
                print(f"\nFailed offset {offset} after {max_retries} attempts.")
                print(f"Error: {e}")
                return []

            # Exponential Backoff with Jitter
            sleep_time = (2 ** attempt) + random.uniform(0, 1)
            print(f"Error at offset {offset}. Retrying in {sleep_time:.2f}s... (Attempt {attempt + 1}/{max_retries})")
            time.sleep(sleep_time)
    return []

def fetch_incremental_data(latest_stored_date):
    """
    Loops using get_data_batch until it hits data we already have.
    """
    new_data = []
    offset = 0
    keep_fetching = True
    
    print(f"Fetching data newer than: {latest_stored_date}")

    while keep_fetching:
        # Use the exact logic from the provided script
        batch = get_data_batch(offset)
        
        if not batch:
            break
            
        for item in batch:
            item_date = item['date']
            # If we hit a date older or equal to our last stored date, stop.
            if latest_stored_date and item_date <= latest_stored_date:
                keep_fetching = False
            else:
                new_data.append(item)
        
        if not keep_fetching:
            print("Reached existing data. Stopping fetch.")
            break

        offset += 15 # Increment by 15 as per original script
        print(f"Fetched offset {offset}...")
        
        # Safety break to prevent infinite loops if something goes wrong with dates
        if offset > 10000: 
            print("Safety limit reached.")
            break
            
    return new_data

# --- MAIN EXECUTION ---

def main():
    # 1. Load Existing Raw Data
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                all_ascents = json.load(f)
        except json.JSONDecodeError:
            all_ascents = []
    else:
        all_ascents = []

    # 2. Determine Latest Date in current file
    latest_date = None
    if all_ascents:
        all_ascents.sort(key=lambda x: x['date'], reverse=True)
        latest_date = all_ascents[0]['date']

    # 3. Fetch Updates (Incremental)
    new_ascents = fetch_incremental_data(latest_date)
    print(f"Fetched {len(new_ascents)} new ascents.")
    
    # 4. Merge and Deduplicate
    ascent_map = {x['id']: x for x in all_ascents}
    for x in new_ascents:
        ascent_map[x['id']] = x
    
    final_data = list(ascent_map.values())
    
    # 5. Clean up old data (keep last 60 days to reduce file size)
    cleanup_date = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    # Normalize date comparison (handle Z vs +00:00)
    final_data = [x for x in final_data if x['date'].replace('Z', '+00:00') > cleanup_date]

    # Save Updated Raw Data
    os.makedirs('data', exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(final_data, f)

    # 6. Calculate Current Leaderboard
    ranker = KayaRanker(final_data)
    current_leaderboard = ranker.run()

    # 7. Compare with Yesterday's Leaderboard (for arrows)
    old_ranks = {}
    if os.path.exists(LEADERBOARD_FILE):
        try:
            with open(LEADERBOARD_FILE, 'r') as f:
                old_leaderboard = json.load(f)
            old_ranks = {x['username']: x['rank'] for x in old_leaderboard}
        except:
            pass

    for row in current_leaderboard:
        username = row['username']
        if username in old_ranks:
            prev = old_ranks[username]
            curr = row['rank']
            row['movement'] = prev - curr 
        else:
            row['movement'] = 'NEW'

    # 8. Save Final Leaderboard
    with open(LEADERBOARD_FILE, 'w') as f:
        json.dump(current_leaderboard, f)
    
    print("Leaderboard updated successfully.")

if __name__ == "__main__":
    main()