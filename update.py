import requests
import json
import os
import math
from datetime import datetime, timedelta, timezone

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

# Get token from GitHub Secrets
AUTH_TOKEN = os.environ.get("KAYA_TOKEN")

headers = {
    'accept': '*/*',
    'authorization': f'Bearer {AUTH_TOKEN}',
    'content-type': 'application/json',
    'origin': 'https://kaya-app.kayaclimb.com',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
}

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
        # Filter for strict 30 day window
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=CONSTANTS['DAYS_WINDOW'])
        
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
            # Update Climbs
            for cid, climb in self.climbs.items():
                sender_ids = climb['senders']
                if not sender_ids: continue
                avg_user_rating = sum(self.users[uid]['rating'] for uid in sender_ids) / len(sender_ids)
                scarcity = calculate_scarcity_bonus(len(sender_ids))
                diff = avg_user_rating - climb['base_rating']
                climb['current_rating'] = climb['base_rating'] + (CONSTANTS['ELASTICITY'] * diff) + scarcity

            # Update Users
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

def fetch_new_data(latest_stored_date):
    """Fetches only data newer than what we have."""
    new_data = []
    offset = 0
    keep_fetching = True
    
    print(f"Fetching data newer than: {latest_stored_date}")

    while keep_fetching:
        query = {
            'operationName': 'webAscentsForGym',
            'variables': {'gym_id': '51', 'offset': offset, 'count': 50},
            'query': 'query webAscentsForGym($gym_id: ID!, $count: Int!, $offset: Int!) {\n  webAscentsForGym(gym_id: $gym_id, count: $count, offset: $offset) {\n    id\n    date\n    user {\n      id\n      username\n      fname\n      lname\n    }\n    climb {\n      slug\n      name\n      grade {\n        name\n      }\n    }\n  }\n}\n'
        }
        
        try:
            response = requests.post('https://kaya-beta.kayaclimb.com/graphql', headers=headers, json=query)
            response.raise_for_status()
            batch = response.json().get('data', {}).get('webAscentsForGym', [])
            
            if not batch: break
            
            for item in batch:
                # Basic check to see if we reached old data
                # Note: This relies on API returning reverse chron. If not, remove this check and fetch all.
                item_date = item['date']
                if latest_stored_date and item_date <= latest_stored_date:
                    keep_fetching = False
                else:
                    new_data.append(item)
            
            offset += 50
            if offset > 2000: break # Safety break
            
        except Exception as e:
            print(f"Error: {e}")
            break
            
    return new_data

def main():
    # 1. Load Existing Raw Data
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            all_ascents = json.load(f)
    else:
        all_ascents = []

    # 2. Determine Latest Date
    latest_date = None
    if all_ascents:
        # Sort to ensure we find the absolute latest
        all_ascents.sort(key=lambda x: x['date'], reverse=True)
        latest_date = all_ascents[0]['date']

    # 3. Fetch Updates
    new_ascents = fetch_new_data(latest_date)
    print(f"Fetched {len(new_ascents)} new ascents.")
    
    # 4. Merge and Deduplicate
    # Use ID as key to prevent duplicates
    ascent_map = {x['id']: x for x in all_ascents}
    for x in new_ascents:
        ascent_map[x['id']] = x
    
    final_data = list(ascent_map.values())
    
    # 5. Clean up old data (optional: remove data older than 60 days to keep file size down)
    cleanup_date = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    final_data = [x for x in final_data if x['date'] > cleanup_date]

    # Save Raw Data
    os.makedirs('data', exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(final_data, f)

    # 6. Calculate Current Leaderboard
    ranker = KayaRanker(final_data)
    current_leaderboard = ranker.run()

    # 7. Compare with Yesterday's Leaderboard
    if os.path.exists(LEADERBOARD_FILE):
        with open(LEADERBOARD_FILE, 'r') as f:
            old_leaderboard = json.load(f)
        
        # Map username -> old_rank
        old_ranks = {x['username']: x['rank'] for x in old_leaderboard}
    else:
        old_ranks = {}

    # Add movement data
    for row in current_leaderboard:
        username = row['username']
        if username in old_ranks:
            prev = old_ranks[username]
            curr = row['rank']
            # If I was 5 and now I am 3, movement is +2 (Good)
            row['movement'] = prev - curr 
        else:
            row['movement'] = 'NEW'

    # 8. Save Leaderboard
    with open(LEADERBOARD_FILE, 'w') as f:
        json.dump(current_leaderboard, f)
    
    print("Update Complete.")

if __name__ == "__main__":
    main()