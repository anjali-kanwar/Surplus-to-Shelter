"""
matching_engine.py
-------------------
Core scoring/ranking logic for the Surplus-to-Shelter matching engine.
Transparent weighted multi-feature scoring (not a trained model --
there's no historical dataset yet at hackathon stage).
"""

import math

DEFAULT_WEIGHTS = {
    "distance": 0.35,
    "capacity_fit": 0.25,
    "urgency_fit": 0.25,
    "reliability": 0.15,
}

CONFIDENCE_THRESHOLD = 0.70
MIN_SCORE_GAP = 0.08


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (math.sin(d_phi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def passes_hard_filters(donation, rescuer, distance_km):
    if donation.get("food_type") not in rescuer.get("accepted_types", []):
        return False
    if donation.get("quantity", 0) > rescuer.get("available_capacity", 0):
        return False
    if distance_km > rescuer.get("accept_radius_km", 10):
        return False
    if rescuer.get("pickup_window_minutes", 0) < 0:
        return False
    return True


def distance_score(distance_km, accept_radius_km):
    if accept_radius_km <= 0:
        return 0.0
    return max(0.0, 1 - (distance_km / accept_radius_km))


def capacity_fit_score(quantity, available_capacity):
    if available_capacity <= 0:
        return 0.0
    ratio = min(1.0, quantity / available_capacity)
    return min(1.0, 0.5 + 0.5 * ratio)


def urgency_fit_score(expiry_minutes, pickup_window_minutes):
    if expiry_minutes <= 0:
        return 0.0
    effective_window = max(30, pickup_window_minutes)
    usable_minutes = min(effective_window, expiry_minutes)
    return max(0.0, min(1.0, usable_minutes / max(1, expiry_minutes)))


def reliability_score(completed_pickups, total_assigned_pickups):
    if total_assigned_pickups <= 0:
        return 0.5
    return min(1.0, completed_pickups / total_assigned_pickups)


def score_candidate(donation, rescuer, weights):
    d_lat, d_lng = float(donation.get("lat") or 0), float(donation.get("lng") or 0)
    r_lat, r_lng = float(rescuer.get("lat") or 0), float(rescuer.get("lng") or 0)

    # If coordinates are at default (0,0), estimate urban radius (~3.2 km)
    if (d_lat == 0 and d_lng == 0) or (r_lat == 0 and r_lng == 0):
        distance_km = 3.2
    else:
        distance_km = haversine_km(d_lat, d_lng, r_lat, r_lng)

    if not passes_hard_filters(donation, rescuer, distance_km):
        return None

    features = {
        "distance": distance_score(distance_km, rescuer.get("accept_radius_km", 10)),
        "capacity_fit": capacity_fit_score(donation["quantity"], rescuer.get("available_capacity", 0)),
        "urgency_fit": urgency_fit_score(donation["expiry_minutes"], rescuer.get("pickup_window_minutes", 0)),
        "reliability": reliability_score(
            rescuer.get("completed_pickups", 0), rescuer.get("total_assigned_pickups", 0)
        ),
    }

    match_score = sum(features[k] * weights[k] for k in weights)

    return {
        "rescuer_id": rescuer["id"],
        "distance_km": round(distance_km, 2),
        "features": {k: round(v, 3) for k, v in features.items()},
        "match_score": round(match_score, 4),
    }


def rank_candidates(donation, candidates, weights=None):
    weights = weights or DEFAULT_WEIGHTS

    scored = []
    for rescuer in candidates:
        result = score_candidate(donation, rescuer, weights)
        if result is not None:
            scored.append(result)

    scored.sort(key=lambda r: r["match_score"], reverse=True)

    if not scored:
        return {"ranked": [], "top_match": None, "confidence": "no_candidates"}

    top = scored[0]
    gap = (top["match_score"] - scored[1]["match_score"]) if len(scored) > 1 else 1.0

    if top["match_score"] >= CONFIDENCE_THRESHOLD and gap >= MIN_SCORE_GAP:
        confidence = "high"
    else:
        confidence = "low"

    return {"ranked": scored, "top_match": top, "confidence": confidence}