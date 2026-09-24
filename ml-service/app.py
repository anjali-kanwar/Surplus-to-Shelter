"""
app.py
------
Flask microservice exposing matching engine and computer vision food analysis over HTTP.
Node calls:
- POST /score: Donation + geo-filtered candidates matching
- POST /analyze-food: Computer vision analysis of surplus food photos
Run: pip install -r requirements.txt && python app.py (port 5001)
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from matching_engine import rank_candidates, DEFAULT_WEIGHTS
from vision_analyzer import analyze_food_image

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("PORT", 5001))


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "Surplus-to-Shelter ML & Vision Engine",
        "version": "2.0.0"
    }), 200


@app.route("/score", methods=["POST"])
def score():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be JSON"}), 400

    donation = body.get("donation")
    candidates = body.get("candidates")
    weights = body.get("weights", DEFAULT_WEIGHTS)

    if not donation or candidates is None:
        return jsonify({"error": "'donation' and 'candidates' are required"}), 400

    required_donation_fields = ["lat", "lng", "food_type", "quantity", "expiry_minutes"]
    missing = [f for f in required_donation_fields if f not in donation]
    if missing:
        return jsonify({"error": f"donation missing fields: {missing}"}), 400

    try:
        result = rank_candidates(donation, candidates, weights)
    except Exception as e:
        return jsonify({"error": f"Scoring failed: {str(e)}"}), 500

    return jsonify(result), 200


@app.route("/analyze-food", methods=["POST"])
def analyze_food():
    """
    Computer Vision endpoint for food photos.
    Receives photoUrl or base64 image data and foodType hint.
    """
    body = request.get_json(silent=True) or {}
    photo_data = body.get("photoUrl") or body.get("image") or ""
    food_type_hint = body.get("foodType") or None

    try:
        analysis = analyze_food_image(photo_data, food_type_hint)
        return jsonify({
            "success": True,
            "analysis": analysis
        }), 200
    except Exception as e:
        return jsonify({"error": f"Vision analysis failed: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
