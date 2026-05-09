import random
import time
import requests
import logging
import os
import json
from groq import Groq

# Configure Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY)
MODEL_NAME = "llama-3.3-70b-versatile"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
BALL_UPDATE_ENDPOINT = f"{BACKEND_URL}/ball-update"

class CricketSimulator:
    def __init__(self):
        self.match_id = "T20-IND-AUS-001"
        self.innings = 1
        self.total_runs = 0
        self.total_wickets = 0
        self.overs_bowled = 0.0
        self.balls_in_over = 0
        
        self.striker = {"name": "Virat Kohli", "runs": 0, "balls": 0}
        self.non_striker = {"name": "Rohit Sharma", "runs": 0, "balls": 0}
        self.bowler = {"name": "Pat Cummins", "overs": 0.0, "runs": 0, "wickets": 0}
        
        self.batting_lineup = [
            "KL Rahul", "Suryakumar Yadav", "Hardik Pandya", "Rishabh Pant", 
            "Ravindra Jadeja", "Ravichandran Ashwin", "Jasprit Bumrah", "Mohammed Shami"
        ]
        self.bowling_lineup = [
            "Mitchell Starc", "Josh Hazlewood", "Adam Zampa", "Glenn Maxwell"
        ]
        
        self.commentary_templates = {
            0: ["No run. Solid defense.", "Straight to the fielder.", "A dot ball."],
            1: ["Pushed into the gap for a single.", "Quick run between the wickets.", "Tucked away for one."],
            2: ["Good running! They push for two.", "A couple of runs added to the total."],
            3: ["Terrific running, they scramble for three!", "Deep into the pocket for three runs."],
            4: ["FOUR! Beautifully timed through the covers.", "CRACKED! That's four all the way."],
            6: ["SIX! That's out of the park!", "HUGE! Over the ropes for a maximum."],
            "wicket": ["OUT! Clean bowled!", "CAUGHT! A massive blow for the batting side.", "GONE! Trapped in front of the stumps."]
        }

    def rotate_strike(self):
        self.striker, self.non_striker = self.non_striker, self.striker

    def update_bowler(self):
        b_overs = int(self.bowler["overs"])
        b_balls = int((self.bowler["overs"] - b_overs) * 10)
        b_balls += 1
        if b_balls == 6:
            self.bowler["overs"] = float(b_overs + 1)
        else:
            self.bowler["overs"] = float(f"{b_overs}.{b_balls}")

    def generate_ai_commentary(self, ball_data):
        """Generates dynamic commentary using Groq AI in JSON format."""
        prompt = f"""
        You are two professional cricket commentators. Generate a short, exciting, one-sentence commentary for the following ball in both English and Hindi.
        
        English Commentary: Must be in the exact style of Ravi Shastri (use phrases like "Tracer bullet", "Flashes and flashes hard", "Just what the doctor ordered").
        Hindi Commentary: Must be in the exact style of Aakash Chopra (use phrases like "Darshak bane fielder", "Chatur chalak chanchal", "Naam hai xyz, kaam karte hain xyz").
        
        Match: IND vs AUS (T20)
        Over: {ball_data['overs']}
        Event: {ball_data['event']}
        Striker: {ball_data['striker']['name']} ({ball_data['striker']['runs']} runs off {ball_data['striker']['balls']} balls)
        Bowler: {ball_data['bowler']['name']}
        Score: {ball_data['total_runs']}/{ball_data['total_wickets']}
        
        Return exactly a JSON object with two keys: "commentary_en" and "commentary_hi".
        """
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=MODEL_NAME,
                response_format={"type": "json_object"}
            )
            content = chat_completion.choices[0].message.content.strip()
            parsed = json.loads(content)
            return parsed
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            event_key = "wicket" if ball_data['wickets'] > 0 else ball_data['runs']
            fallback = random.choice(self.commentary_templates.get(event_key, ["A solid ball."]))
            return {"commentary_en": fallback, "commentary_hi": "Achi gend."}

    def next_ball(self):
        event_types = [0, 1, 2, 3, 4, 6, "wicket"]
        weights = [35, 30, 10, 2, 12, 6, 5]
        
        event = random.choices(event_types, weights=weights)[0]
        
        self.balls_in_over += 1
        self.striker["balls"] += 1
        self.update_bowler()
        
        event_desc = ""
        if event == "wicket":
            self.total_wickets += 1
            self.bowler["wickets"] += 1
            event_desc = "WICKET!"
            if self.total_wickets < 10:
                self.striker = {"name": self.batting_lineup.pop(0), "runs": 0, "balls": 0}
            else:
                event_desc = "ALL OUT!"
        else:
            runs = int(event)
            self.total_runs += runs
            self.striker["runs"] += runs
            self.bowler["runs"] += runs
            event_desc = f"{runs} runs" if runs != 0 else "No run"
            if runs % 2 != 0:
                self.rotate_strike()

        overs_int = int(self.overs_bowled)
        if self.balls_in_over == 6:
            self.overs_bowled = float(overs_int + 1)
            self.balls_in_over = 0
            self.rotate_strike()
            self.bowler = {"name": random.choice(self.bowling_lineup), "overs": 0.0, "runs": 0, "wickets": 0}
        else:
            self.overs_bowled = float(f"{overs_int}.{self.balls_in_over}")

        ball_data = {
            "match_id": self.match_id,
            "innings": self.innings,
            "overs": self.overs_bowled,
            "runs": int(event) if event != "wicket" else 0,
            "wickets": 1 if event == "wicket" else 0,
            "total_runs": self.total_runs,
            "total_wickets": self.total_wickets,
            "striker": self.striker.copy(),
            "non_striker": self.non_striker.copy(),
            "bowler": self.bowler.copy(),
            "event": event_desc,
            "commentary_en": "",
            "commentary_hi": ""
        }

        ai_commentary = self.generate_ai_commentary(ball_data)
        ball_data["commentary_en"] = ai_commentary.get("commentary_en", "")
        ball_data["commentary_hi"] = ai_commentary.get("commentary_hi", "")
        return ball_data

    def run(self):
        logger.info("Starting Cricket Simulation with Groq AI...")
        time.sleep(10)
        while self.total_wickets < 10 and self.overs_bowled < 20.0:
            ball_data = self.next_ball()
            try:
                response = requests.post(BALL_UPDATE_ENDPOINT, json=ball_data)
                if response.status_code == 200:
                    logger.info(f"Published ball: {ball_data['overs']} - {ball_data['event']}")
                else:
                    logger.error(f"Failed to publish: {response.text}")
            except Exception as e:
                logger.error(f"Error sending update: {e}")
            time.sleep(random.uniform(12, 15))
        logger.info("Match Ended.")

if __name__ == "__main__":
    sim = CricketSimulator()
    sim.run()
