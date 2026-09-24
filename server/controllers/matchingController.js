const axios = require('axios');
const Donation = require('../models/Donation');
const User = require('../models/User');
const Match = require('../models/Match');

/**
 * Helper to compute remaining minutes in today's pickup window
 * @param {string} startTimeStr "HH:MM"
 * @param {string} endTimeStr "HH:MM"
 * @returns {number} minutes remaining
 */
const computePickupWindowMinutes = (startTimeStr, endTimeStr) => {
  if (!startTimeStr || !endTimeStr) {
    return 180; // default 3 hours window if not specified
  }

  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    const windowDuration = Math.max(60, endMinutes - startMinutes);

    if (currentMinutes < startMinutes) {
      // Window hasn't started yet today, remaining duration is full window
      return windowDuration;
    } else if (currentMinutes <= endMinutes) {
      // Inside window, remaining minutes until end
      return Math.max(30, endMinutes - currentMinutes);
    } else {
      // Window closed for today, available for next window cycle
      return windowDuration;
    }
  } catch (err) {
    return 180;
  }
};

/**
 * Trigger matching flow for a given donation
 * @param {string|ObjectId} donationId
 */
const triggerMatching = async (donationId) => {
  try {
    // 1. Fetch Donation by ID
    const donation = await Donation.findById(donationId);
    if (!donation) {
      console.error(`[Matching] Donation not found with ID: ${donationId}`);
      return null;
    }

    // 2. Query candidate rescuers from MongoDB
    const candidateRescuers = await User.find({
      role: 'rescuer',
      acceptedTypes: donation.foodType,
      availableCapacity: { $gte: donation.quantity },
    });

    // If no candidate rescuers match the criteria
    if (!candidateRescuers || candidateRescuers.length === 0) {
      console.log(`[Matching] No matching candidate rescuers found for donation: ${donationId}. Routing to Admin review.`);

      // Find any rescuer or fallback to assign for admin review
      const anyRescuer = await User.findOne({ role: 'rescuer' });

      if (anyRescuer) {
        const match = await Match.create({
          donation: donation._id,
          rescuer: anyRescuer._id,
          matchScore: 0,
          confidence: 'low',
          status: 'pending_confirmation',
          isAdminReview: true,
          rankedCandidates: [],
        });
        return match;
      }
      return null;
    }

    // 3. Build the request body for ML service
    const now = Date.now();
    const expiryMinutes = Math.max(
      0,
      Math.round((new Date(donation.expiryAt).getTime() - now) / (1000 * 60))
    );

    const payload = {
      donation: {
        lat: donation.location?.lat || 0,
        lng: donation.location?.lng || 0,
        food_type: donation.foodType,
        quantity: donation.quantity,
        expiry_minutes: expiryMinutes,
      },
      candidates: candidateRescuers.map((r) => ({
        id: r._id.toString(),
        lat: r.location?.lat || 0,
        lng: r.location?.lng || 0,
        accepted_types: r.acceptedTypes || [],
        available_capacity: r.availableCapacity || 0,
        accept_radius_km: r.acceptRadiusKm || 10,
        pickup_window_minutes: computePickupWindowMinutes(r.pickupWindowStart, r.pickupWindowEnd),
        completed_pickups: r.completedPickups || 0,
        total_assigned_pickups: r.totalAssignedPickups || 0,
      })),
    };

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';

    let mlResponseData;
    try {
      // 4. POST to ML service /score endpoint
      const res = await axios.post(`${mlServiceUrl}/score`, payload, {
        timeout: 5000,
      });
      mlResponseData = res.data;
    } catch (mlError) {
      console.warn(`[Matching] ML Service unreachable or error (${mlError.message}). Using fallback scoring.`);
      // Fallback response if ML service is not active
      mlResponseData = {
        confidence: 'low',
        ranked: candidateRescuers.map((r, idx) => ({
          rescuer_id: r._id.toString(),
          match_score: Math.max(10, 100 - idx * 10),
        })),
        top_match: {
          rescuer_id: candidateRescuers[0]._id.toString(),
          match_score: 80,
        },
      };
    }

    // 5. Process ML response
    const { ranked, top_match, confidence } = mlResponseData;

    const rankedCandidates = (ranked || []).map((item) => ({
      rescuer: item.rescuer_id || item.rescuer || item.id,
      score: item.match_score ?? item.score ?? 0,
    }));

    const topRescuerId =
      top_match?.rescuer_id ||
      top_match?.rescuer ||
      top_match?.id ||
      (rankedCandidates[0] ? rankedCandidates[0].rescuer : candidateRescuers[0]._id);

    const matchScore =
      top_match?.match_score ??
      top_match?.score ??
      (rankedCandidates[0] ? rankedCandidates[0].score : 0);

    let match;

    if (confidence === 'high' && topRescuerId) {
      match = await Match.create({
        donation: donation._id,
        rescuer: topRescuerId,
        matchScore,
        confidence: 'high',
        status: 'pending_confirmation',
        isAdminReview: false,
        rankedCandidates,
      });

      // Update donation status to matched
      donation.status = 'matched';
      await donation.save();
    } else {
      // Low confidence or admin review required
      match = await Match.create({
        donation: donation._id,
        rescuer: topRescuerId || candidateRescuers[0]._id,
        matchScore,
        confidence: 'low',
        status: 'pending_confirmation',
        isAdminReview: true,
        rankedCandidates,
      });
    }

    console.log(`[Matching] Match created (${match._id}) for Donation ${donation._id} with confidence: ${confidence}`);
    return match;
  } catch (error) {
    console.error('[Matching Error] triggerMatching failed:', error);
    throw error;
  }
};

module.exports = {
  triggerMatching,
  computePickupWindowMinutes,
};
