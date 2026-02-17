import requests
from tqdm import tqdm
import time
import random
import pandas as pd
import numpy as np
import math
from datetime import datetime, timedelta, timezone
from collections import defaultdict


headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjI3NzUzLCJlbWFpbCI6ImNhcmxhbmRlci5kYW5pZWxAZ21haWwuY29tIiwiaWF0IjoxNzcxMzcxODI0LCJleHAiOjE3NzEzNzkwMjR9.77jsd1if182amzohNWHnhblno8I6T_zmNdVKG_khG8A',
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


# --- CONFIGURATION ---
CONSTANTS = {
    'BASE_POINTS_V0': 1000,
    'POINTS_PER_GRADE': 100,
    'DECAY_FACTOR': 0.8,      # How fast previous climbs lose value (0.8 is standard)
    'ELASTICITY': 0.5,        # How much the climbers affect the grade (0.0 to 1.0)
    'SCARCITY_WEIGHT': 50,    # Points bonus for rare climbs
    'ITERATIONS': 5,          # How many times to refine the scores
    'DAYS_WINDOW': 30         # Time window
}

def parse_grade_to_points(grade_str):
    """Converts 'v6', 'V10', etc. to a base numeric score."""
    if not grade_str:
        return CONSTANTS['BASE_POINTS_V0']
    
    # Simple parsing logic for V-scale
    g = grade_str.lower().replace('v', '').strip()
    
    # Handle ranges or weird formatting if necessary
    try:
        if '-' in g: g = g.split('-')[1] # take upper bound of v3-4
        grade_num = int(float(g))
    except ValueError:
        grade_num = 0 # Default to V0 if parsing fails
        
    return CONSTANTS['BASE_POINTS_V0'] + (grade_num * CONSTANTS['POINTS_PER_GRADE'])

def calculate_scarcity_bonus(ascent_count):
    """Calculates bonus points for climbs with few ascents."""
    # Logarithmic decay: High bonus for 1 ascent, low for 100.
    # We add 1 to avoid division by zero if logic changes
    if ascent_count <= 0: return 0
    return CONSTANTS['SCARCITY_WEIGHT'] * (1 / math.log(ascent_count + 1.1))

class KayaRanker:
    def __init__(self, data):
        self.raw_data = data
        self.users = {}   # Map: user_id -> {stats}
        self.climbs = {}  # Map: climb_slug -> {stats}
        self.ascents = [] # List of valid processed ascents
        
    def run(self):
        self._preprocess_data()
        self._initialize_ratings()
        self._iterative_solve()
        return self._generate_leaderboard()

    def _preprocess_data(self):
        """Filters dates and builds initial objects."""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=CONSTANTS['DAYS_WINDOW'])
        
        print(f"Filtering data since: {cutoff_date.date()}")
        
        for entry in self.raw_data:
            # 1. Date Check
            try:
                # Handle Z notation for python < 3.11
                d_str = entry['date'].replace('Z', '+00:00')
                ascent_date = datetime.fromisoformat(d_str)
                if ascent_date < cutoff_date:
                    continue
            except ValueError:
                continue # Skip bad dates

            # 2. Extract Info
            u_data = entry['user']
            c_data = entry['climb']
            grade_str = c_data.get('grade', {}).get('name', 'v0')
            base_points = parse_grade_to_points(grade_str)
            
            uid = u_data['id']
            cid = c_data['slug']
            
            # 3. Build/Update User Object
            if uid not in self.users:
                self.users[uid] = {
                    'name': f"{u_data['fname']} {u_data['lname']}",
                    'username': u_data['username'],
                    'sends': [], # List of climb_slugs
                    'rating': 0,
                    'max_base_grade': 0
                }
            
            # Keep track of max grade for initialization
            if base_points > self.users[uid]['max_base_grade']:
                self.users[uid]['max_base_grade'] = base_points
                
            self.users[uid]['sends'].append(cid)

            # 4. Build/Update Climb Object
            if cid not in self.climbs:
                self.climbs[cid] = {
                    'name': c_data.get('name') or c_data.get('slug'),
                    'grade_name': grade_str,
                    'base_rating': base_points,
                    'current_rating': base_points, # Starts at base
                    'senders': set() # Set of user_ids to avoid double counting
                }
            self.climbs[cid]['senders'].add(uid)

    def _initialize_ratings(self):
        """Set initial user rating to their max grade climbed."""
        for uid, user in self.users.items():
            # Initial guess: You are as strong as your hardest send
            user['rating'] = user['max_base_grade']

    def _iterative_solve(self):
        """The core mathematical loop."""
        # CONSTANTS['DECAY_FACTOR'] should be changed to 0.1 or 0.2 for this logic
        # But to be safe, let's hardcode a distinct VOLUME_FACTOR for the aggregation
        VOLUME_FACTOR = 0.1 

        for i in range(CONSTANTS['ITERATIONS']):
            # Step A: Update Climb Ratings (Keep this exactly the same!)
            for cid, climb in self.climbs.items():
                sender_ids = climb['senders']
                if not sender_ids: continue
                
                # Note: We still use the user's rating from the previous round
                avg_user_rating = sum(self.users[uid]['rating'] for uid in sender_ids) / len(sender_ids)
                scarcity = calculate_scarcity_bonus(len(sender_ids))
                
                diff = avg_user_rating - climb['base_rating']
                climb['current_rating'] = climb['base_rating'] + (CONSTANTS['ELASTICITY'] * diff) + scarcity

            # Step B: Update User Ratings (CHANGE THIS SECTION)
            for uid, user in self.users.items():
                user_sends_scores = [self.climbs[cid]['current_rating'] for cid in user['sends']]
                user_sends_scores.sort(reverse=True)
                
                # NEW LOGIC: Weighted Sum (Aggressive Decay)
                # Score = Top_Climb + (2nd * 0.1) + (3rd * 0.01)...
                new_score = 0
                
                for idx, score in enumerate(user_sends_scores):
                    # We dampen the decay heavily so volume can't overtake grades
                    # Limit to top 5-10 climbs to prevent floating point weirdness
                    if idx > 10: break 
                    
                    weight = VOLUME_FACTOR ** idx
                    new_score += score * weight
                
                user['rating'] = new_score

    def _generate_leaderboard(self):
        # Convert dict to list and sort
        leaderboard = []
        for uid, user in self.users.items():
            leaderboard.append({
                'rank': 0,
                'name': user['name'],
                'username': user['username'],
                'score': int(user['rating']),
                'top_send': max([self.climbs[cid]['grade_name'] for cid in user['sends']], key=lambda x: parse_grade_to_points(x)),
                'total_sends': len(user['sends'])
            })
        
        # Sort by score descending
        leaderboard.sort(key=lambda x: x['score'], reverse=True)
        
        # Add rank numbers
        for i, row in enumerate(leaderboard):
            row['rank'] = i + 1
            
        return leaderboard

def get_data(offset, max_retries=20):
    json_data = {
        'operationName': 'webAscentsForGym',
        'variables': {
            'gym_id': '51',
            'offset': offset,
            'count': 15,
        },
        # (Query string remains exactly the same as your original code)
        'query': 'query webAscentsForGym($gym_id: ID!, $count: Int!, $offset: Int!) {\n  webAscentsForGym(gym_id: $gym_id, count: $count, offset: $offset) {\n    ...WebAscentFields\n    __typename\n  }\n}\n\nfragment WebAscentFields on WebAscent {\n  id\n  user {\n    ...WebUserFields\n    __typename\n  }\n  climb {\n    ...WebClimbBasicFields\n    __typename\n  }\n  date\n  comment\n  rating\n  stiffness\n  grade {\n    ...GradeFields\n    __typename\n  }\n  photo {\n    photo_url\n    thumb_url\n    __typename\n  }\n  video {\n    video_url\n    thumb_url\n    __typename\n  }\n  __typename\n}\n\nfragment WebUserFields on WebUser {\n  id\n  username\n  fname\n  lname\n  photo_url\n  is_private\n  bio\n  height\n  ape_index\n  limit_grade_bouldering {\n    name\n    id\n    __typename\n  }\n  limit_grade_routes {\n    name\n    id\n    __typename\n  }\n  is_premium\n  __typename\n}\n\nfragment WebClimbBasicFields on WebClimb {\n  slug\n  name\n  rating\n  ascent_count\n  grade {\n    name\n    id\n    __typename\n  }\n  climb_type {\n    name\n    __typename\n  }\n  color {\n    name\n    __typename\n  }\n  gym {\n    name\n    __typename\n  }\n  board {\n    name\n    __typename\n  }\n  destination {\n    name\n    __typename\n  }\n  area {\n    name\n    __typename\n  }\n  is_gb_moderated\n  is_access_sensitive\n  is_closed\n  is_offensive\n  __typename\n}\n\nfragment GradeFields on Grade {\n  id\n  name\n  climb_type_id\n  grade_type_id\n  ordering\n  mapped_grade_ids\n  climb_type_group\n  __typename\n}\n',
    }

    # Retry Loop
    for attempt in range(max_retries):
        try:
            response = requests.post('https://kaya-beta.kayaclimb.com/graphql', headers=headers, json=json_data)
            
            # 1. Check valid HTTP Status
            response.raise_for_status() 
            
            # 2. Parse JSON
            res_json = response.json()

            # 3. Check for GraphQL specific errors (where data is None)
            if 'errors' in res_json or res_json.get('data') is None:
                # Force an exception to trigger the retry logic
                raise ValueError(f"GraphQL Error: {res_json.get('errors')}")

            # If we get here, success!
            return res_json['data']['webAscentsForGym']

        except Exception as e:
            # If this was the last attempt, fail loudly
            if attempt == max_retries - 1:
                print(f"\nFailed offset {offset} after {max_retries} attempts.")
                print(f"Error: {e}")
                return [] # Return empty list so the main loop continues without crashing

            # Calculate Exponential Backoff with Jitter
            # 2 ** attempt gives: 1, 2, 4, 8, 16 seconds
            sleep_time = (2 ** attempt) + random.uniform(0, 1)
            
            # Print a small warning so you know it's pausing
            # Using tqdm.write prevents the progress bar from breaking
            tqdm.write(f"Error at offset {offset}. Retrying in {sleep_time:.2f}s... (Attempt {attempt + 1}/{max_retries})")
            
            time.sleep(sleep_time)

data = []
# Added chunking to the range to make it easier to test
for offset in tqdm(range(0, 100000, 15)):
    result = get_data(offset)
    if result:
        data.extend(result)

print(f"Total records fetched: {len(data)}")

ranker = KayaRanker(data)
leaderboard = ranker.run()

# 3. Print Results
print(f"{'RANK':<5} {'SCORE':<8} {'NAME':<20} {'TOP GRADE':<10} {'SENDS (30d)':<10}")
print("-" * 60)
for row in leaderboard[:50]:
    print(f"{row['rank']:<5} {row['score']:<8} {row['name']:<20} {row['top_send']:<10} {row['total_sends']:<10}")

